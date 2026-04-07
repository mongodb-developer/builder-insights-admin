import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection, collections } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// GET /api/events - List all events with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500');
    const skip = parseInt(searchParams.get('skip') || '0');
    const status = searchParams.get('status');
    const region = searchParams.get('region');
    const eventType = searchParams.get('eventType');
    const quarter = searchParams.get('quarter');
    const search = searchParams.get('search');
    const isVirtual = searchParams.get('isVirtual');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const col = await getCollection(collections.events);
    
    const filter: any = {};
    if (status) filter.status = status;
    if (region) {
      // Support region in top-level field or nested in account.region
      filter.$or = [{ region }, { 'account.region': region }];
    }
    if (eventType) filter.$or = [
      { eventType },
      { engagementType: eventType },
    ];
    if (quarter) filter.quarter = quarter;
    if (isVirtual !== null && isVirtual !== undefined) {
      filter.isVirtual = isVirtual === 'true';
    }
    if (dateFrom || dateTo) {
      filter.startDate = {};
      if (dateFrom) filter.startDate.$gte = dateFrom;
      if (dateTo) filter.startDate.$lte = dateTo;
    }
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      // Combine with existing $or if present
      const searchOr = [
        { name: searchRegex },
        { location: searchRegex },
        { 'account.name': searchRegex },
      ];
      if (filter.$or) {
        // Wrap existing $or and search $or in $and
        const existingOr = filter.$or;
        delete filter.$or;
        filter.$and = [
          { $or: existingOr },
          { $or: searchOr },
        ];
      } else {
        filter.$or = searchOr;
      }
    }

    const [events, total] = await Promise.all([
      col.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({ events, total, limit, skip });
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const col = await getCollection(collections.events);

    const now = new Date().toISOString();
    const event = {
      ...body,
      _id: new ObjectId().toString(),
      insightCount: 0,
      createdAt: now,
      updatedAt: now,
      synced: true,
    };

    await col.insertOne(event as any);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('POST /api/events error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
