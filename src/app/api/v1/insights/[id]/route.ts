/**
 * Public API v1 - Single Insight
 *
 * GET /api/v1/insights/:id  - Get insight by ID (requires insights:read)
 * PUT /api/v1/insights/:id  - Update insight (requires insights:write)
 *
 * Authentication: X-API-Key header
 */

import { NextRequest } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { authenticateV1Request, isErrorResponse, v1Error, v1Success } from '@/lib/api-v1-helpers';

export const dynamic = 'force-dynamic';

// GET /api/v1/insights/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateV1Request(request, 'insights:read');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const ctx = { endpoint: `/api/v1/insights/${id}`, method: 'GET', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const col = await getCollection(collections.insights);
    const insight = await col.findOne(
      { _id: id as any },
      {
        projection: {
          _id: 1, text: 1, title: 1, type: 1, sentiment: 1, priority: 1,
          productAreas: 1, tags: 1, eventId: 1, eventName: 1, sessionId: 1,
          advocateId: 1, advocateName: 1, capturedAt: 1, createdAt: 1,
          updatedAt: 1, aiDistillation: 1, annotations: 1,
        },
      }
    );

    if (!insight) {
      return v1Error('Insight not found', 404, undefined, ctx);
    }

    return v1Success({ data: insight }, 200, ctx);
  } catch (error) {
    console.error('GET /api/v1/insights/[id] error:', error);
    return v1Error('Failed to fetch insight', 500, undefined, ctx);
  }
}

// PUT /api/v1/insights/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateV1Request(request, 'insights:write');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const ctx = { endpoint: `/api/v1/insights/${id}`, method: 'PUT', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const body = await request.json();
    const col = await getCollection(collections.insights);

    const allowedFields = ['text', 'title', 'type', 'sentiment', 'priority', 'productAreas', 'tags', 'followUpRequired'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return v1Error('No valid fields to update. Allowed fields: ' + allowedFields.join(', '), 400, undefined, ctx);
    }

    updates.updatedAt = new Date().toISOString();

    const result = await col.findOneAndUpdate(
      { _id: id as any },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return v1Error('Insight not found', 404, undefined, ctx);
    }

    return v1Success({ data: result }, 200, ctx);
  } catch (error) {
    console.error('PUT /api/v1/insights/[id] error:', error);
    return v1Error('Failed to update insight', 500, undefined, ctx);
  }
}
