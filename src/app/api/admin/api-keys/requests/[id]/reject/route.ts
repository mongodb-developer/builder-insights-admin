/**
 * Admin: Reject API Key Request
 *
 * POST /api/admin/api-keys/requests/:id/reject
 *
 * Rejects a pending request with an optional note.
 * Requires admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const note = body.note || '';

    const db = await getDb();
    const result = await db.collection('api_key_requests').updateOne(
      { _id: new ObjectId(id), status: 'pending' },
      {
        $set: {
          status: 'rejected',
          reviewedBy: session.email,
          reviewedAt: new Date().toISOString(),
          reviewNote: note,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('POST /api/admin/api-keys/requests/[id]/reject error:', error);
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
  }
}
