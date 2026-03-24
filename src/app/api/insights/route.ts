import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// GET /api/insights - List insights with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const eventId = searchParams.get('eventId');
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type');
    const sentiment = searchParams.get('sentiment');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source');

    const col = await getCollection(collections.insights);
    
    const filter: any = {};
    if (eventId) filter.eventId = eventId;
    if (sessionId) filter.sessionId = sessionId;
    if (type) filter.type = type;
    if (sentiment) filter.sentiment = sentiment;
    if (priority) filter.priority = priority;
    if (source) filter.source = source;

    const [insights, total] = await Promise.all([
      col.find(filter).sort({ capturedAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({ insights, total, limit, skip });
  } catch (error) {
    console.error('GET /api/insights error:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}

// POST /api/insights - Create insight or get stats
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const col = await getCollection(collections.insights);
    
    // Stats aggregation
    if (body.action === 'stats') {
      const [byType, bySentiment, byPriority, byProductArea] = await Promise.all([
        col.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray(),
        col.aggregate([
          { $group: { _id: '$sentiment', count: { $sum: 1 } } }
        ]).toArray(),
        col.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]).toArray(),
        col.aggregate([
          { $unwind: '$productAreas' },
          { $group: { _id: '$productAreas', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray(),
      ]);

      return NextResponse.json({
        byType: Object.fromEntries(byType.map(x => [x._id, x.count])),
        bySentiment: Object.fromEntries(bySentiment.map(x => [x._id, x.count])),
        byPriority: Object.fromEntries(byPriority.map(x => [x._id, x.count])),
        byProductArea: Object.fromEntries(byProductArea.map(x => [x._id, x.count])),
      });
    }

    // Create new insight
    if (body.text || body.type) {
      const { ObjectId } = await import('mongodb');
      const now = new Date().toISOString();
      
      const insight: Record<string, any> = {
        _id: new ObjectId().toString(),
        text: body.text || '',
        type: body.type || 'General Feedback',
        sentiment: body.sentiment || 'Neutral',
        priority: body.priority || 'Medium',
        productAreas: body.productAreas || [],
        eventId: body.eventId || null,
        eventName: body.eventName || null,
        sessionId: body.sessionId || null,
        advocateId: body.advocateId || null,
        advocateName: body.advocateName || 'Unknown',
        developerInfo: body.developerInfo || {},
        tags: body.tags || [],
        followUpRequired: body.followUpRequired || false,
        capturedAt: body.capturedAt || now,
        createdAt: now,
        updatedAt: now,
        synced: true,
      };

      // Optional fields from mobile app (AI distillation, audio intelligence, transcription)
      if (body.title !== undefined) insight.title = body.title;
      if (body.aiDistillation !== undefined) insight.aiDistillation = body.aiDistillation;
      if (body.audioIntelligence !== undefined) insight.audioIntelligence = body.audioIntelligence;
      if (body.pendingTranscription !== undefined) insight.pendingTranscription = body.pendingTranscription;
      if (body.transcriptionError !== undefined) insight.transcriptionError = body.transcriptionError;

      await col.insertOne(insight as any);
      
      // Update event insight count if linked
      if (insight.eventId) {
        const eventsCol = await getCollection(collections.events);
        await eventsCol.updateOne(
          { _id: insight.eventId },
          { $inc: { insightCount: 1 } }
        );
      }

      return NextResponse.json(insight, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/insights error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
