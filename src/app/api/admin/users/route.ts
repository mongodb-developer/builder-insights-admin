import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, requireAdmin } from '@/lib/auth';
import { ROLES, Role, ROLE_LABELS } from '@/lib/roles';
import { logActivity, ensureActivityIndexes } from '@/lib/activity';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/admin/users - List all users (advocates)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // Require admin
    await requireAdmin();

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const active = searchParams.get('active');

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const advocates = await db
      .collection('advocates')
      .find(filter)
      .sort({ name: 1 })
      .toArray();

    // Get insight counts per advocate
    const insightCounts = await db
      .collection('insights')
      .aggregate([
        { $group: { _id: '$advocateId', count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap = Object.fromEntries(
      insightCounts.map((c) => [c._id, c.count])
    );

    // Get login stats from activity_log (last login + count per user)
    ensureActivityIndexes();
    const loginStats = await db
      .collection('activity_log')
      .aggregate([
        { $match: { action: 'login' } },
        {
          $group: {
            _id: '$email',
            totalLogins: { $sum: 1 },
            lastLoginAt: { $max: '$timestamp' },
            lastSource: { $last: '$source' },
            last30DaysLogins: {
              $sum: {
                $cond: [
                  { $gte: ['$timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const loginMap = Object.fromEntries(
      loginStats.map((s) => [s._id, {
        totalLogins: s.totalLogins,
        lastLoginAt: s.lastLoginAt,
        lastSource: s.lastSource,
        last30DaysLogins: s.last30DaysLogins,
      }])
    );

    const users = advocates.map((a) => {
      const email = (a.email || '').toLowerCase();
      const login = loginMap[email] || null;
      return {
        _id: a._id.toString(),
        email: a.email || '',
        name: a.name || '',
        role: a.role || ROLES.ADVOCATE,
        roleLabel: ROLE_LABELS[(a.role as Role) || ROLES.ADVOCATE],
        title: a.title || a.jobTitle || null,
        region: a.region || '',
        isActive: a.isActive !== false,
        isAdmin: a.role === ROLES.ADMIN || a.isAdmin === true,
        avatarUrl: a.avatarUrl || null,
        insightCount: countMap[a._id.toString()] || 0,
        lastAccessAt: a.lastAccessAt || null,
        lastLoginAt: login?.lastLoginAt || a.lastAccessAt || null,
        lastLoginSource: login?.lastSource || null,
        totalLogins: login?.totalLogins || 0,
        last30DaysLogins: login?.last30DaysLogins || 0,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });

    return NextResponse.json({ 
      users,
      total: users.length,
      roles: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/admin/users error:', message);
    
    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/admin/users - Create a new user (advocate)
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const db = await getDb();
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = await db.collection('advocates').findOne({
      email: { $regex: new RegExp(`^${body.email}$`, 'i') },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const role = body.role || ROLES.ADVOCATE;

    const advocate = {
      email: body.email.toLowerCase(),
      name: body.name,
      role,
      isAdmin: role === ROLES.ADMIN,
      title: body.title || null,
      region: body.region || null,
      isActive: body.isActive !== false,
      avatarUrl: body.avatarUrl || null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('advocates').insertOne(advocate);

    // Log user creation
    logActivity({
      action: 'user_created',
      email: admin.email,
      advocateId: admin.advocateId || null,
      targetEmail: advocate.email,
      targetAdvocateId: result.insertedId.toString(),
      source: 'web',
      details: { role, name: advocate.name },
    });

    return NextResponse.json(
      { 
        ...advocate, 
        _id: result.insertedId.toString(),
        roleLabel: ROLE_LABELS[role as Role],
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/admin/users error:', message);

    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/admin/users - Bulk update users
// ============================================================================
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const db = await getDb();
    const body = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.role !== undefined) {
      updates.role = body.role;
      updates.isAdmin = body.role === ROLES.ADMIN;
    }
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.region !== undefined) updates.region = body.region;

    const objectIds = body.ids.map((id: string) => new ObjectId(id));

    const result = await db.collection('advocates').updateMany(
      { _id: { $in: objectIds } },
      { $set: updates }
    );

    return NextResponse.json({
      modifiedCount: result.modifiedCount,
      message: `Updated ${result.modifiedCount} users`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/admin/users error:', message);

    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update users' }, { status: 500 });
  }
}
