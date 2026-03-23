import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection, collections } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Build a filter that matches _id as either an ObjectId or a string,
// since advocates may have been created with either format.
function idFilter(id: string) {
  try {
    const oid = new ObjectId(id);
    return { $or: [{ _id: oid as any }, { _id: id as any }] };
  } catch {
    // Not a valid ObjectId hex string — match as plain string only
    return { _id: id as any };
  }
}

// Require at least manager role (defense-in-depth — middleware also checks)
async function requireManager() {
  const session = await getSession();
  if (!session) {
    return { error: 'Authentication required', status: 401 };
  }
  const role = session.role;
  if (role !== 'admin' && role !== 'manager') {
    return { error: 'Manager or admin access required', status: 403 };
  }
  return null;
}

// GET /api/advocates/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const col = await getCollection(collections.advocates);
    
    const advocate = await col.findOne(idFilter(id));

    if (!advocate) {
      return NextResponse.json({ error: 'Advocate not found' }, { status: 404 });
    }

    return NextResponse.json(advocate);
  } catch (error) {
    console.error('GET /api/advocates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch advocate' }, { status: 500 });
  }
}

// PUT /api/advocates/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth check (defense-in-depth)
    const authError = await requireManager();
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { id } = await params;
    const body = await request.json();
    const col = await getCollection(collections.advocates);

    const filter = idFilter(id);

    const result = await col.updateOne(
      filter,
      { 
        $set: { 
          ...body, 
          updatedAt: new Date().toISOString() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Advocate not found' }, { status: 404 });
    }

    const updated = await col.findOne(filter);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/advocates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update advocate' }, { status: 500 });
  }
}

// DELETE /api/advocates/[id] — soft delete (sets isActive: false)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth check (defense-in-depth)
    const authError = await requireManager();
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { id } = await params;
    const col = await getCollection(collections.advocates);

    const filter = idFilter(id);

    // Soft delete: set isActive to false instead of removing the document
    const result = await col.updateOne(
      filter,
      {
        $set: {
          isActive: false,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Advocate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/advocates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to deactivate advocate' }, { status: 500 });
  }
}
