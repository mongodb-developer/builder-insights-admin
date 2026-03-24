import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import {
  evaluateProfileCompleteness,
  sanitizeProfileUpdate,
  PROFILE_COMPLETE_THRESHOLD,
} from '@/lib/profile';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a filter that matches _id as ObjectId or string */
function idFilter(id: string) {
  try {
    const oid = new ObjectId(id);
    return { $or: [{ _id: oid as any }, { _id: id as any }] };
  } catch {
    return { _id: id as any };
  }
}

/** Find the advocate record for the logged-in user */
async function findCurrentAdvocate(session: { email: string; advocateId?: string | null }) {
  const db = await getDb();
  const col = db.collection('advocates');

  // Try by advocateId first (fast path)
  if (session.advocateId) {
    const byId = await col.findOne(idFilter(session.advocateId));
    if (byId) return byId;
  }

  // Fallback: match by email
  return col.findOne({
    email: { $regex: new RegExp(`^${session.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
}

// ---------------------------------------------------------------------------
// GET /api/profile — current user profile + completeness
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const advocate = await findCurrentAdvocate(session);

    if (!advocate) {
      // Tester accounts without a DB record — return a synthetic profile
      return NextResponse.json({
        advocate: {
          _id: session.advocateId || `session_${session.email}`,
          name: session.name,
          email: session.email,
          role: session.role,
          isAdmin: session.isAdmin,
        },
        completeness: {
          percentage: 20,
          missingFields: ['title', 'linkedinUrl', 'phone', 'region', 'location', 'bio', 'timezone', 'github', 'twitter'],
          isComplete: false,
          threshold: PROFILE_COMPLETE_THRESHOLD,
        },
      });
    }

    const result = evaluateProfileCompleteness(advocate as any);

    return NextResponse.json({
      advocate: {
        _id: advocate._id,
        name: advocate.name,
        email: advocate.email,
        title: advocate.title || '',
        role: advocate.role,
        region: advocate.region || '',
        isAdmin: advocate.isAdmin,
        isActive: advocate.isActive,
        avatarUrl: advocate.avatarUrl || '',
        linkedinUrl: advocate.linkedinUrl || '',
        phone: advocate.phone || '',
        bio: advocate.bio || '',
        location: advocate.location || '',
        timezone: advocate.timezone || '',
        github: advocate.github || '',
        twitter: advocate.twitter || '',
        autoProvisioned: advocate.autoProvisioned || false,
        profileCompletedAt: advocate.profileCompletedAt || null,
      },
      completeness: {
        percentage: result.percentage,
        missingFields: result.missingFields.map(f => f.key),
        missingFieldLabels: result.missingFields.map(f => f.label),
        isComplete: result.isComplete,
        threshold: PROFILE_COMPLETE_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('[GET /api/profile]', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/profile — update own profile (self-service)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const updates = sanitizeProfileUpdate(body);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('advocates');

    const advocate = await findCurrentAdvocate(session);

    if (!advocate) {
      // For tester accounts that have no DB record, create one
      const now = new Date().toISOString();
      const newDoc = {
        _id: session.advocateId || `session_${session.email}`,
        email: session.email,
        name: session.name,
        role: session.role,
        isAdmin: session.isAdmin,
        isActive: true,
        ...updates,
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(newDoc as any);

      const completeness = evaluateProfileCompleteness(newDoc as any);
      return NextResponse.json({
        advocate: newDoc,
        completeness: {
          percentage: completeness.percentage,
          missingFields: completeness.missingFields.map(f => f.key),
          isComplete: completeness.isComplete,
          threshold: PROFILE_COMPLETE_THRESHOLD,
        },
      });
    }

    // Check if profile will be newly completed
    const currentResult = evaluateProfileCompleteness(advocate as any);
    const merged = { ...advocate, ...updates };
    const updatedResult = evaluateProfileCompleteness(merged as any);

    const setFields: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Stamp profileCompletedAt the first time profile reaches threshold
    if (!currentResult.isComplete && updatedResult.isComplete && !advocate.profileCompletedAt) {
      setFields.profileCompletedAt = new Date().toISOString();
    }

    const filter = idFilter(advocate._id.toString());
    await col.updateOne(filter, { $set: setFields });

    const updated = await col.findOne(filter);
    const finalResult = evaluateProfileCompleteness((updated || merged) as any);

    return NextResponse.json({
      advocate: updated || merged,
      completeness: {
        percentage: finalResult.percentage,
        missingFields: finalResult.missingFields.map(f => f.key),
        isComplete: finalResult.isComplete,
        threshold: PROFILE_COMPLETE_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('[PUT /api/profile]', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
