/**
 * Admin API Key Management - Single Key
 *
 * GET    /api/admin/api-keys/:id  - Get key details + usage stats
 * PUT    /api/admin/api-keys/:id  - Update key settings
 * DELETE /api/admin/api-keys/:id  - Revoke key
 *
 * Requires admin role (enforced by middleware on /api/admin/*).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyById, updateApiKey, revokeApiKey, getApiKeyUsageStats, ALL_SCOPES } from '@/lib/api-keys';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Get key details and usage stats
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Get usage stats for last 30 days
    // We need the hash for usage lookup, but we don't expose it.
    // Instead, look up usage by key ID via the api_keys collection.
    return NextResponse.json({ key });
  } catch (error) {
    console.error('GET /api/admin/api-keys/[id] error:', error);
    return NextResponse.json({ error: 'Failed to get API key' }, { status: 500 });
  }
}

// PUT - Update key settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, scopes, rateLimit, expiresAt, isActive } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;
    if (rateLimit !== undefined) updates.rateLimit = rateLimit;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt;

    if (scopes !== undefined) {
      const invalidScopes = scopes.filter((s: string) => !ALL_SCOPES.includes(s as any));
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          { error: `Invalid scopes: ${invalidScopes.join(', ')}` },
          { status: 400 }
        );
      }
      updates.scopes = scopes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const success = await updateApiKey(id, updates);
    if (!success) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const updated = await getApiKeyById(id);
    return NextResponse.json({ key: updated });
  } catch (error) {
    console.error('PUT /api/admin/api-keys/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}

// DELETE - Revoke key
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const success = await revokeApiKey(id, session.email);
    if (!success) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key revoked' });
  } catch (error) {
    console.error('DELETE /api/admin/api-keys/[id] error:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
