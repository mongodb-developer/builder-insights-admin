/**
 * API Key Requests
 *
 * POST /api/api-keys/requests  - Submit a request for an API key
 *
 * Any authenticated user can submit a request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { ALL_SCOPES } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const token = request.cookies.get(COOKIE_NAME)?.value
      || request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, intendedUse, requestedScopes } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!intendedUse || typeof intendedUse !== 'string' || intendedUse.trim().length === 0) {
      return NextResponse.json({ error: 'intendedUse is required' }, { status: 400 });
    }
    if (!requestedScopes || !Array.isArray(requestedScopes) || requestedScopes.length === 0) {
      return NextResponse.json({ error: 'At least one scope is required' }, { status: 400 });
    }
    const invalidScopes = requestedScopes.filter((s: string) => !ALL_SCOPES.includes(s as any));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const apiKeyRequest = {
      name: name.trim(),
      description: (description || '').trim(),
      intendedUse: intendedUse.trim(),
      requestedScopes,
      requesterEmail: user.email,
      requesterName: user.name,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('api_key_requests').insertOne(apiKeyRequest);

    return NextResponse.json(
      { message: 'Request submitted successfully', request: apiKeyRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/api-keys/requests error:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
