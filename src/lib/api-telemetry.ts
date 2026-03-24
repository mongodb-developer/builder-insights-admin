/**
 * API Telemetry - Records v1 public API usage into telemetry_events
 *
 * Writes documents compatible with the monitoring dashboard aggregation
 * pipelines (category: 'api_call' and category: 'v1_api'), enabling
 * the monitoring page to display public API metrics alongside mobile
 * app telemetry.
 */

import { getDb } from './mongodb';

export interface ApiTelemetryEvent {
  event: string;
  endpoint: string;
  method: string;
  success: boolean;
  statusCode: number;
  durationMs: number;
  error?: string;
  apiKeyPrefix?: string;
  ownerEmail?: string;
  source: 'public_api';
}

/**
 * Record a public API call as a telemetry event.
 * Fire-and-forget — errors are logged but never propagated.
 */
export async function recordApiTelemetry(evt: ApiTelemetryEvent): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date();

    // Write two documents:
    // 1. A 'v1_api' category event for the dedicated API Usage tab
    // 2. An 'api_call' category event so it also shows in the existing Health tab
    const baseDoc = {
      event: evt.event,
      eventTimestamp: now,
      receivedAt: now,
      sessionId: `api-${evt.apiKeyPrefix || 'unknown'}`,
      userId: evt.ownerEmail || null,
      userName: evt.apiKeyPrefix || 'API Client',
      userEmail: evt.ownerEmail || null,
      appVersion: 'v1',
      platform: 'api',
      deviceModel: null,
      ip: null,
    };

    const docs = [
      {
        ...baseDoc,
        category: 'v1_api',
        properties: {
          endpoint: evt.endpoint,
          method: evt.method,
          success: evt.success,
          status: evt.statusCode,
          durationMs: evt.durationMs,
          error: evt.error || null,
          apiKeyPrefix: evt.apiKeyPrefix || null,
          source: evt.source,
        },
      },
      {
        ...baseDoc,
        category: 'api_call',
        properties: {
          endpoint: evt.endpoint,
          method: evt.method,
          success: evt.success,
          status: evt.statusCode,
          durationMs: evt.durationMs,
          error: evt.error || null,
          source: evt.source,
        },
      },
    ];

    await db.collection('telemetry_events').insertMany(docs);
  } catch (error) {
    console.error('[ApiTelemetry] Failed to record event:', error);
  }
}
