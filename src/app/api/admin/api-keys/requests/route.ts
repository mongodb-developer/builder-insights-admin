/**
 * Admin: List API Key Requests
 *
 * GET /api/admin/api-keys/requests  - List all API key requests
 *
 * Requires admin role (enforced by middleware on /api/admin/*).
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const requests = await db
      .collection('api_key_requests')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('GET /api/admin/api-keys/requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}
