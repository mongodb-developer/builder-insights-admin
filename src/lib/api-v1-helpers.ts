/**
 * Shared helpers for /api/v1/* public API routes.
 *
 * Handles API key extraction, validation, scope checking, usage recording,
 * and telemetry emission for the monitoring dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, recordApiUsage, ApiScope, ApiKey } from './api-keys';
import { recordApiTelemetry } from './api-telemetry';

export interface ApiContext {
  key: ApiKey;
  /** Start time for latency measurement */
  startTime: number;
}

/**
 * Authenticate and authorize a v1 API request.
 * Returns the API key context on success, or a NextResponse error on failure.
 */
export async function authenticateV1Request(
  request: NextRequest,
  requiredScope: ApiScope
): Promise<ApiContext | NextResponse> {
  const startTime = Date.now();
  const pathname = new URL(request.url).pathname;

  // Extract API key from X-API-Key header
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    // Record failed auth telemetry
    recordApiTelemetry({
      event: 'v1_api_call',
      endpoint: pathname,
      method: request.method,
      success: false,
      statusCode: 401,
      durationMs: Date.now() - startTime,
      error: 'Missing API key',
      source: 'public_api',
    }).catch(() => {});

    return NextResponse.json(
      {
        error: 'Missing API key',
        message: 'Include your API key in the X-API-Key header',
        docs: '/docs/api',
      },
      { status: 401 }
    );
  }

  // Validate the key
  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.key) {
    const statusCode = validation.error?.includes('Rate limit') ? 429 : 401;

    recordApiTelemetry({
      event: 'v1_api_call',
      endpoint: pathname,
      method: request.method,
      success: false,
      statusCode,
      durationMs: Date.now() - startTime,
      error: validation.error || 'Invalid API key',
      source: 'public_api',
    }).catch(() => {});

    return NextResponse.json(
      {
        error: 'Authentication failed',
        message: validation.error || 'Invalid API key',
      },
      { status: statusCode }
    );
  }

  // Check scope
  if (!validation.key.scopes.includes(requiredScope)) {
    recordApiTelemetry({
      event: 'v1_api_call',
      endpoint: pathname,
      method: request.method,
      success: false,
      statusCode: 403,
      durationMs: Date.now() - startTime,
      error: `Missing scope: ${requiredScope}`,
      apiKeyPrefix: validation.key.prefix,
      ownerEmail: validation.key.ownerEmail,
      source: 'public_api',
    }).catch(() => {});

    return NextResponse.json(
      {
        error: 'Insufficient permissions',
        message: `This API key does not have the '${requiredScope}' scope. Contact your administrator to update the key.`,
        requiredScope,
        grantedScopes: validation.key.scopes,
      },
      { status: 403 }
    );
  }

  // Record usage (fire-and-forget)
  recordApiUsage(validation.key.keyHash, pathname, request.method).catch(() => {});

  return { key: validation.key, startTime };
}

/**
 * Check if the result is a NextResponse (error) or an ApiContext (success).
 */
export function isErrorResponse(result: ApiContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Standard v1 error response. Also records telemetry.
 */
export function v1Error(
  message: string,
  status: number = 400,
  details?: Record<string, unknown>,
  ctx?: { endpoint: string; method: string; startTime: number; apiKeyPrefix?: string }
) {
  if (ctx) {
    recordApiTelemetry({
      event: 'v1_api_call',
      endpoint: ctx.endpoint,
      method: ctx.method,
      success: false,
      statusCode: status,
      durationMs: Date.now() - ctx.startTime,
      error: message,
      apiKeyPrefix: ctx.apiKeyPrefix,
      source: 'public_api',
    }).catch(() => {});
  }
  return NextResponse.json({ error: message, ...details }, { status });
}

/**
 * Standard v1 success response. Also records telemetry.
 */
export function v1Success(
  data: Record<string, unknown>,
  status: number = 200,
  ctx?: { endpoint: string; method: string; startTime: number; apiKeyPrefix?: string }
) {
  if (ctx) {
    recordApiTelemetry({
      event: 'v1_api_call',
      endpoint: ctx.endpoint,
      method: ctx.method,
      success: true,
      statusCode: status,
      durationMs: Date.now() - ctx.startTime,
      apiKeyPrefix: ctx.apiKeyPrefix,
      source: 'public_api',
    }).catch(() => {});
  }
  return NextResponse.json(data, { status });
}
