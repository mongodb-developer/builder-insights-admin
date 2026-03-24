/**
 * Public API v1 - Single Event
 *
 * GET /api/v1/events/:id  - Get event by ID (requires events:read)
 *
 * Authentication: X-API-Key header
 */

import { NextRequest } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { authenticateV1Request, isErrorResponse, v1Error, v1Success } from '@/lib/api-v1-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateV1Request(request, 'events:read');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const ctx = { endpoint: `/api/v1/events/${id}`, method: 'GET', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const col = await getCollection(collections.events);
    const event = await col.findOne({ _id: id as any });

    if (!event) {
      return v1Error('Event not found', 404, undefined, ctx);
    }

    return v1Success({ data: event }, 200, ctx);
  } catch (error) {
    console.error('GET /api/v1/events/[id] error:', error);
    return v1Error('Failed to fetch event', 500, undefined, ctx);
  }
}
