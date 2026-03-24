/**
 * Public API v1 - Insights
 *
 * GET  /api/v1/insights  - List insights (requires insights:read scope)
 * POST /api/v1/insights  - Create an insight (requires insights:write scope)
 *
 * Authentication: X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { authenticateV1Request, isErrorResponse, v1Error, v1Success } from '@/lib/api-v1-helpers';

export const dynamic = 'force-dynamic';

// Valid enum values for validation
const VALID_TYPES = [
  'Pain Point', 'Feature Request', 'Praise', 'Question',
  'Use Case', 'Competition', 'Documentation', 'General Feedback', 'Other',
];
const VALID_SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const VALID_PRODUCT_AREAS = [
  'Atlas', 'Atlas Search', 'Atlas Vector Search', 'Atlas Stream Processing',
  'Atlas Charts', 'Atlas Data Federation', 'Atlas Device Sync', 'Realm',
  'Compass', 'MongoDB Shell', 'Drivers', 'Community', 'Documentation', 'Other',
];

// GET /api/v1/insights - List insights with filtering and pagination
export async function GET(request: NextRequest) {
  const auth = await authenticateV1Request(request, 'insights:read');
  if (isErrorResponse(auth)) return auth;

  const ctx = { endpoint: '/api/v1/insights', method: 'GET', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = parseInt(searchParams.get('skip') || '0');
    const eventId = searchParams.get('eventId');
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type');
    const sentiment = searchParams.get('sentiment');
    const priority = searchParams.get('priority');
    const productArea = searchParams.get('productArea');
    const since = searchParams.get('since');
    const until = searchParams.get('until');

    const col = await getCollection(collections.insights);

    const filter: Record<string, any> = {};
    if (eventId) filter.eventId = eventId;
    if (sessionId) filter.sessionId = sessionId;
    if (type) filter.type = type;
    if (sentiment) filter.sentiment = sentiment;
    if (priority) filter.priority = priority;
    if (productArea) filter.productAreas = productArea;
    if (since || until) {
      filter.capturedAt = {};
      if (since) filter.capturedAt.$gte = since;
      if (until) filter.capturedAt.$lte = until;
    }

    const [insights, total] = await Promise.all([
      col.find(filter)
        .sort({ capturedAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          _id: 1, text: 1, title: 1, type: 1, sentiment: 1, priority: 1,
          productAreas: 1, tags: 1, eventId: 1, eventName: 1, sessionId: 1,
          advocateId: 1, advocateName: 1, capturedAt: 1, createdAt: 1,
          updatedAt: 1, aiDistillation: 1,
        })
        .toArray(),
      col.countDocuments(filter),
    ]);

    return v1Success({
      data: insights,
      pagination: { total, limit, skip, hasMore: skip + limit < total },
    }, 200, ctx);
  } catch (error) {
    console.error('GET /api/v1/insights error:', error);
    return v1Error('Failed to fetch insights', 500, undefined, ctx);
  }
}

// POST /api/v1/insights - Create a new insight
export async function POST(request: NextRequest) {
  const auth = await authenticateV1Request(request, 'insights:write');
  if (isErrorResponse(auth)) return auth;

  const ctx = { endpoint: '/api/v1/insights', method: 'POST', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const body = await request.json();

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return v1Error('text is required and must be a non-empty string', 400, undefined, ctx);
    }
    if (body.type && !VALID_TYPES.includes(body.type)) {
      return v1Error(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400, undefined, ctx);
    }
    if (body.sentiment && !VALID_SENTIMENTS.includes(body.sentiment)) {
      return v1Error(`Invalid sentiment. Must be one of: ${VALID_SENTIMENTS.join(', ')}`, 400, undefined, ctx);
    }
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return v1Error(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400, undefined, ctx);
    }
    if (body.productAreas) {
      if (!Array.isArray(body.productAreas)) {
        return v1Error('productAreas must be an array', 400, undefined, ctx);
      }
      const invalid = body.productAreas.filter((p: string) => !VALID_PRODUCT_AREAS.includes(p));
      if (invalid.length > 0) {
        return v1Error(`Invalid productAreas: ${invalid.join(', ')}. Valid values: ${VALID_PRODUCT_AREAS.join(', ')}`, 400, undefined, ctx);
      }
    }

    const { ObjectId } = await import('mongodb');
    const now = new Date().toISOString();
    const col = await getCollection(collections.insights);

    const insight: Record<string, any> = {
      _id: new ObjectId().toString(),
      text: body.text.trim(),
      title: body.title?.trim() || null,
      type: body.type || 'General Feedback',
      sentiment: body.sentiment || 'Neutral',
      priority: body.priority || 'Medium',
      productAreas: body.productAreas || [],
      tags: body.tags || [],
      eventId: body.eventId || null,
      eventName: body.eventName || null,
      sessionId: body.sessionId || null,
      advocateId: body.advocateId || null,
      advocateName: body.advocateName || auth.key.ownerName,
      developerInfo: body.developerInfo || {},
      followUpRequired: body.followUpRequired || false,
      capturedAt: body.capturedAt || now,
      createdAt: now,
      updatedAt: now,
      synced: true,
      source: 'api',
      apiKeyPrefix: auth.key.prefix,
    };

    await col.insertOne(insight as any);

    if (insight.eventId) {
      const eventsCol = await getCollection(collections.events);
      await eventsCol.updateOne(
        { _id: insight.eventId },
        { $inc: { insightCount: 1 } }
      );
    }

    return v1Success({ data: insight }, 201, ctx);
  } catch (error) {
    console.error('POST /api/v1/insights error:', error);
    return v1Error('Failed to create insight', 500, undefined, ctx);
  }
}
