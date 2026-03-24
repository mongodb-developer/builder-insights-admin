/**
 * Public API v1 - Events
 *
 * GET  /api/v1/events  - List events (requires events:read scope)
 * POST /api/v1/events  - Create an event (requires events:write scope)
 *
 * Authentication: X-API-Key header
 */

import { NextRequest } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { authenticateV1Request, isErrorResponse, v1Error, v1Success } from '@/lib/api-v1-helpers';

export const dynamic = 'force-dynamic';

// GET /api/v1/events
export async function GET(request: NextRequest) {
  const auth = await authenticateV1Request(request, 'events:read');
  if (isErrorResponse(auth)) return auth;

  const ctx = { endpoint: '/api/v1/events', method: 'GET', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = parseInt(searchParams.get('skip') || '0');
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    const search = searchParams.get('search');

    const col = await getCollection(collections.events);

    const filter: Record<string, any> = {};
    if (since || until) {
      filter.startDate = {};
      if (since) filter.startDate.$gte = since;
      if (until) filter.startDate.$lte = until;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const [events, total] = await Promise.all([
      col.find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          _id: 1, name: 1, description: 1, location: 1, startDate: 1,
          endDate: 1, type: 1, status: 1, insightCount: 1,
          createdAt: 1, updatedAt: 1,
        })
        .toArray(),
      col.countDocuments(filter),
    ]);

    return v1Success({
      data: events,
      pagination: { total, limit, skip, hasMore: skip + limit < total },
    }, 200, ctx);
  } catch (error) {
    console.error('GET /api/v1/events error:', error);
    return v1Error('Failed to fetch events', 500, undefined, ctx);
  }
}

// POST /api/v1/events
export async function POST(request: NextRequest) {
  const auth = await authenticateV1Request(request, 'events:write');
  if (isErrorResponse(auth)) return auth;

  const ctx = { endpoint: '/api/v1/events', method: 'POST', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return v1Error('name is required', 400, undefined, ctx);
    }

    const { ObjectId } = await import('mongodb');
    const now = new Date().toISOString();
    const col = await getCollection(collections.events);

    const event: Record<string, any> = {
      _id: new ObjectId().toString(),
      name: body.name.trim(),
      description: body.description?.trim() || '',
      location: body.location?.trim() || '',
      startDate: body.startDate || now,
      endDate: body.endDate || null,
      type: body.type || 'conference',
      status: body.status || 'upcoming',
      insightCount: 0,
      createdAt: now,
      updatedAt: now,
      source: 'api',
      apiKeyPrefix: auth.key.prefix,
    };

    await col.insertOne(event as any);
    return v1Success({ data: event }, 201, ctx);
  } catch (error) {
    console.error('POST /api/v1/events error:', error);
    return v1Error('Failed to create event', 500, undefined, ctx);
  }
}
