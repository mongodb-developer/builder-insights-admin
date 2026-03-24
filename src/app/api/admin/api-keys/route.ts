/**
 * Admin API Key Management
 *
 * GET  /api/admin/api-keys   - List all API keys
 * POST /api/admin/api-keys   - Generate a new API key
 *
 * Requires admin role (enforced by middleware on /api/admin/*).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateApiKey, listApiKeys, ALL_SCOPES } from '@/lib/api-keys';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - List all API keys
export async function GET() {
  try {
    const keys = await listApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('GET /api/admin/api-keys error:', error);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

// POST - Generate a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, ownerEmail, ownerName, scopes, rateLimit, expiresAt } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!ownerEmail || typeof ownerEmail !== 'string') {
      return NextResponse.json({ error: 'ownerEmail is required' }, { status: 400 });
    }
    if (!ownerName || typeof ownerName !== 'string') {
      return NextResponse.json({ error: 'ownerName is required' }, { status: 400 });
    }

    // Validate scopes
    const requestedScopes = scopes || ['insights:read', 'insights:write'];
    const invalidScopes = requestedScopes.filter((s: string) => !ALL_SCOPES.includes(s as any));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid scopes: ${ALL_SCOPES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await generateApiKey({
      name: name.trim(),
      description: description?.trim(),
      ownerEmail,
      ownerName,
      scopes: requestedScopes,
      rateLimit: typeof rateLimit === 'number' ? rateLimit : 1000,
      expiresAt: expiresAt || null,
      createdBy: session.email,
    });

    return NextResponse.json(
      {
        message: 'API key created. Store the key securely - it cannot be retrieved again.',
        key: result.plaintextKey,
        apiKey: result.apiKey,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/api-keys error:', error);
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
  }
}
