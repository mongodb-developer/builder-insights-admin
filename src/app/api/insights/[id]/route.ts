import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface InsightDoc {
  _id: string;
  eventId?: string;
  text: string;
  type: string;
  sentiment: string;
  priority: string;
  productAreas?: string[];
  tags?: string[];
  annotations?: any[];
  upvotes?: string[];
  createdAt: string;
  updatedAt: string;
}

// GET /api/insights/[id] - Get single insight
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const col = await getCollection(collections.insights);
    
    const insight = await col.findOne({ _id: id as unknown as any });
    
    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json(insight);
  } catch (error) {
    console.error('GET /api/insights/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch insight' }, { status: 500 });
  }
}

// PUT /api/insights/[id] - Update insight
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const col = await getCollection(collections.insights);

    // Ownership check: advocates can only edit their own insights
    const session = await getSession();
    if (session && session.role === 'advocate') {
      const existing = await col.findOne({ _id: id as unknown as any });
      if (existing && existing.advocateId !== session.advocateId) {
        return NextResponse.json(
          { error: 'You can only edit your own insights' },
          { status: 403 }
        );
      }
    }

    // Fields that can be updated
    const allowedFields = [
      'text', 'type', 'sentiment', 'priority', 'productAreas',
      'tags', 'followUpRequired', 'developerInfo', 'annotations',
      'title', 'aiDistillation', 'audioIntelligence',
      'pendingTranscription', 'transcriptionError',
    ];

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const result = await col.findOneAndUpdate(
      { _id: id as unknown as any },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/insights/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 });
  }
}

// DELETE /api/insights/[id] - Delete insight
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const col = await getCollection(collections.insights);

    const insight = await col.findOne({ _id: id as unknown as any });
    
    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Ownership check: advocates can only delete their own insights
    const session = await getSession();
    if (session && session.role === 'advocate') {
      if (insight.advocateId !== session.advocateId) {
        return NextResponse.json(
          { error: 'You can only delete your own insights' },
          { status: 403 }
        );
      }
    }

    await col.deleteOne({ _id: id as unknown as any });

    // Decrement event insight count if linked
    const doc = insight as unknown as InsightDoc;
    if (doc.eventId) {
      const eventsCol = await getCollection(collections.events);
      await eventsCol.updateOne(
        { _id: doc.eventId as unknown as any },
        { $inc: { insightCount: -1 } }
      );
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error('DELETE /api/insights/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete insight' }, { status: 500 });
  }
}

// POST /api/insights/[id] - Add annotation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const col = await getCollection(collections.insights);

    if (body.action === 'annotate') {
      const { ObjectId } = await import('mongodb');
      
      const annotation = {
        _id: new ObjectId().toString(),
        advocateId: body.advocateId,
        advocateName: body.advocateName || 'Unknown',
        text: body.text,
        createdAt: new Date().toISOString(),
      };

      const result = await col.findOneAndUpdate(
        { _id: id as unknown as any },
        { 
          $push: { annotations: annotation } as any,
          $set: { updatedAt: new Date().toISOString() }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, annotation, insight: result });
    }

    if (body.action === 'upvote') {
      const advocateId = body.advocateId;
      if (!advocateId) {
        return NextResponse.json({ error: 'advocateId required' }, { status: 400 });
      }

      const result = await col.findOneAndUpdate(
        { _id: id as unknown as any },
        { 
          $addToSet: { upvotes: advocateId } as any,
          $set: { updatedAt: new Date().toISOString() }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
      }

      const doc = result as unknown as InsightDoc;
      return NextResponse.json({ success: true, upvoteCount: doc.upvotes?.length || 0 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/insights/[id] error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
