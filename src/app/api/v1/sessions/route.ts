/**
 * Public API v1 - Sessions
 *
 * GET /api/v1/sessions  - List sessions (requires sessions:read scope)
 *
 * Authentication: X-API-Key header
 */

import { NextRequest } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { authenticateV1Request, isErrorResponse, v1Error, v1Success } from '@/lib/api-v1-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateV1Request(request, 'sessions:read');
  if (isErrorResponse(auth)) return auth;

  const ctx = { endpoint: '/api/v1/sessions', method: 'GET', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = parseInt(searchParams.get('skip') || '0');
    const eventId = searchParams.get('eventId');

    const col = await getCollection(collections.sessions);

    const filter: Record<string, any> = {};
    if (eventId) filter.eventId = eventId;

    const [sessions, total] = await Promise.all([
      col.find(filter).sort({ startTime: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return v1Success({
      data: sessions,
      pagination: { total, limit, skip, hasMore: skip + limit < total },
    }, 200, ctx);
  } catch (error) {
    console.error('GET /api/v1/sessions error:', error);
    return v1Error('Failed to fetch sessions', 500, undefined, ctx);
  }
}
