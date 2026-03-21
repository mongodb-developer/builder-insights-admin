/**
 * Telemetry Events API
 *
 * Receives batched telemetry events from the mobile app.
 * Events are stored in the `telemetry_events` collection with denormalized
 * session/user context for efficient aggregation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

interface TelemetryEvent {
  event: string;
  category: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

interface TelemetryBatch {
  sessionId: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  appVersion: string | null;
  platform: string;
  deviceModel: string | null;
  events: TelemetryEvent[];
}

/**
 * POST - Receive a batch of telemetry events from the mobile app.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as TelemetryBatch | null;

    if (!body || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    // Get IP for geo enrichment (same pattern as analytics/ping)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIP || 'unknown';

    const db = await getDb();
    const now = new Date();

    // Flatten batch into individual documents for flexible querying
    const documents = body.events.map((evt) => ({
      // Event data
      event: evt.event,
      category: evt.category,
      properties: evt.properties || {},
      eventTimestamp: new Date(evt.timestamp),

      // Session context (denormalized for query performance)
      sessionId: body.sessionId,
      userId: body.userId,
      userName: body.userName,
      userEmail: body.userEmail,
      appVersion: body.appVersion,
      platform: body.platform,
      deviceModel: body.deviceModel,
      ip,

      // Server metadata
      receivedAt: now,
    }));

    await db.collection('telemetry_events').insertMany(documents);

    return NextResponse.json({
      success: true,
      received: documents.length,
    });
  } catch (error) {
    console.error('[Analytics] Events ingest error:', error);
    return NextResponse.json(
      { error: 'Failed to record events' },
      { status: 500 },
    );
  }
}
