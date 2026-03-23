import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection, collections } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/advocates - List all advocates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const active = searchParams.get('active');

    const col = await getCollection(collections.advocates);
    
    const filter: any = {};
    if (role) filter.role = role;
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const advocates = await col.find(filter).sort({ name: 1 }).toArray();

    return NextResponse.json({ advocates });
  } catch (error) {
    console.error('GET /api/advocates error:', error);
    return NextResponse.json({ error: 'Failed to fetch advocates' }, { status: 500 });
  }
}

// POST /api/advocates - Create advocate (requires manager or admin role)
export async function POST(request: NextRequest) {
  try {
    // Auth check (defense-in-depth — middleware also checks)
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.role !== 'admin' && session.role !== 'manager') {
      return NextResponse.json({ error: 'Manager or admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const col = await getCollection(collections.advocates);

    const now = new Date().toISOString();
    const role = body.role || 'advocate';
    const advocate = {
      _id: new ObjectId().toString(),
      email: body.email,
      name: body.name,
      title: body.title || null,
      role,
      region: body.region || null,
      isAdmin: role === 'admin',
      isActive: body.isActive ?? true,
      avatarUrl: body.avatarUrl || null,
      createdAt: now,
      updatedAt: now,
    };

    // Check for duplicate email
    const existing = await col.findOne({ email: body.email });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    await col.insertOne(advocate as any);
    return NextResponse.json(advocate, { status: 201 });
  } catch (error) {
    console.error('POST /api/advocates error:', error);
    return NextResponse.json({ error: 'Failed to create advocate' }, { status: 500 });
  }
}
