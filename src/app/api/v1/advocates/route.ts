/**
 * Public API v1 - Advocates
 *
 * GET /api/v1/advocates  - List advocates (requires advocates:read scope)
 *
 * Authentication: X-API-Key header
 */

import { NextRequest } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { authenticateV1Request, isErrorResponse, v1Error, v1Success } from '@/lib/api-v1-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateV1Request(request, 'advocates:read');
  if (isErrorResponse(auth)) return auth;

  const ctx = { endpoint: '/api/v1/advocates', method: 'GET', startTime: auth.startTime, apiKeyPrefix: auth.key.prefix };

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = parseInt(searchParams.get('skip') || '0');

    const col = await getCollection(collections.advocates);

    const [advocates, total] = await Promise.all([
      col.find({ isActive: { $ne: false } })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .project({ _id: 1, name: 1, role: 1, createdAt: 1 })
        .toArray(),
      col.countDocuments({ isActive: { $ne: false } }),
    ]);

    return v1Success({
      data: advocates,
      pagination: { total, limit, skip, hasMore: skip + limit < total },
    }, 200, ctx);
  } catch (error) {
    console.error('GET /api/v1/advocates error:', error);
    return v1Error('Failed to fetch advocates', 500, undefined, ctx);
  }
}
