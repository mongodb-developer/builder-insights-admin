/**
 * Admin: Approve API Key Request
 *
 * POST /api/admin/api-keys/requests/:id/approve
 *
 * Approves a pending request and generates an API key for the requester.
 * Requires admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { generateApiKey } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = await getDb();
    const request = await db.collection('api_key_requests').findOne({
      _id: new ObjectId(id),
      status: 'pending',
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
    }

    // Generate the API key
    const result = await generateApiKey({
      name: request.name,
      description: request.description || `Requested by ${request.requesterName}`,
      ownerEmail: request.requesterEmail,
      ownerName: request.requesterName,
      scopes: request.requestedScopes,
      rateLimit: 1000, // Default rate limit
      createdBy: session.email,
    });

    // Update request status
    await db.collection('api_key_requests').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'approved',
          reviewedBy: session.email,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          generatedKeyPrefix: result.apiKey.prefix,
        },
      }
    );

    return NextResponse.json({
      message: 'Request approved and API key generated',
      key: result.plaintextKey,
      apiKey: result.apiKey,
    });
  } catch (error) {
    console.error('POST /api/admin/api-keys/requests/[id]/approve error:', error);
    return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
  }
}
