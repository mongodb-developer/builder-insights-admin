import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET /api/sessions - List sessions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const isWorkshop = searchParams.get('isWorkshop');

    const col = await getCollection(collections.sessions);
    
    const filter: Record<string, any> = {};
    if (eventId) filter.eventId = eventId;
    if (isWorkshop !== null) filter.isWorkshop = isWorkshop === 'true';

    const [sessions, total] = await Promise.all([
      col.find(filter)
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({ sessions, total, limit, skip });
  } catch (error) {
    console.error('GET /api/sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/sessions - Create session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.eventId || !body.title) {
      return NextResponse.json(
        { error: 'eventId and title are required' },
        { status: 400 }
      );
    }

    const col = await getCollection(collections.sessions);
    const eventsCol = await getCollection(collections.events);

    // Verify event exists
    const event = await eventsCol.findOne({ _id: body.eventId });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const sessionId = new ObjectId().toString();
    
    const session = {
      _id: sessionId,
      eventId: body.eventId,
      title: body.title,
      description: body.description || null,
      speaker: body.speaker || null,
      room: body.room || null,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      isWorkshop: body.isWorkshop || false,
      attendanceEstimate: body.attendanceEstimate || null,
      audienceSize: body.audienceSize || null,
      duration: body.duration || null,
      engagementNotes: body.engagementNotes || null,
      commonQuestions: body.commonQuestions || [],
      resonantDemos: body.resonantDemos || [],
      createdAt: now,
      updatedAt: now,
    };

    await col.insertOne(session as any);

    // Also add to the event's embedded sessions array for denormalization
    await eventsCol.updateOne(
      { _id: body.eventId },
      { 
        $push: { sessions: session } as any,
        $set: { updatedAt: now }
      }
    );

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
