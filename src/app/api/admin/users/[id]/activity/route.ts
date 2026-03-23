import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { getUserActivity, getUserLoginStats } from '@/lib/activity';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/admin/users/[id]/activity - Get user activity log
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const actionsParam = searchParams.get('actions');
    const actions = actionsParam ? actionsParam.split(',') as any[] : undefined;

    // Resolve advocate by ID or email
    let advocate;
    try {
      advocate = await db.collection('advocates').findOne({ _id: new ObjectId(id) });
    } catch {
      advocate = await db.collection('advocates').findOne({
        email: { $regex: new RegExp(`^${id}$`, 'i') },
      });
    }

    if (!advocate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const email = advocate.email;
    const advocateId = advocate._id.toString();

    // Fetch activity log and login stats in parallel
    const [activity, loginStats] = await Promise.all([
      getUserActivity({ email }, { limit, skip, actions }),
      getUserLoginStats({ email }),
    ]);

    // Format entries for the frontend
    const entries = activity.entries.map((entry) => ({
      _id: entry._id.toString(),
      action: entry.action,
      email: entry.email,
      advocateId: entry.advocateId,
      targetEmail: entry.targetEmail || null,
      targetAdvocateId: entry.targetAdvocateId || null,
      source: entry.source || null,
      ip: entry.ip || null,
      userAgent: entry.userAgent || null,
      details: entry.details || null,
      timestamp: entry.timestamp,
    }));

    return NextResponse.json({
      entries,
      total: activity.total,
      loginStats,
      advocate: {
        _id: advocateId,
        name: advocate.name,
        email: advocate.email,
        role: advocate.role,
        lastAccessAt: advocate.lastAccessAt || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/admin/users/[id]/activity error:', message);

    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 });
  }
}
