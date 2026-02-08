import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { ROLES, Role, ROLE_LABELS } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/admin/users/[id] - Get single user
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const db = await getDb();

    let filter: Record<string, unknown>;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      // Try by email if not a valid ObjectId
      filter = { email: { $regex: new RegExp(`^${id}$`, 'i') } };
    }

    const advocate = await db.collection('advocates').findOne(filter);

    if (!advocate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get insight count
    const insightCount = await db.collection('insights').countDocuments({
      advocateId: advocate._id.toString(),
    });

    return NextResponse.json({
      _id: advocate._id.toString(),
      email: advocate.email || '',
      name: advocate.name || '',
      role: advocate.role || ROLES.ADVOCATE,
      roleLabel: ROLE_LABELS[(advocate.role as Role) || ROLES.ADVOCATE],
      region: advocate.region || '',
      isActive: advocate.isActive !== false,
      isAdmin: advocate.role === ROLES.ADMIN || advocate.isAdmin === true,
      avatarUrl: advocate.avatarUrl || null,
      insightCount,
      lastActiveAt: advocate.lastActiveAt || null,
      createdAt: advocate.createdAt,
      updatedAt: advocate.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/admin/users/[id] error:', message);

    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/admin/users/[id] - Update single user
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    // Prevent admin from demoting themselves
    const advocate = await db.collection('advocates').findOne({
      _id: new ObjectId(id),
    });

    if (!advocate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (
      advocate.email.toLowerCase() === admin.email.toLowerCase() &&
      body.role !== undefined &&
      body.role !== ROLES.ADMIN
    ) {
      return NextResponse.json(
        { error: 'Cannot demote yourself from admin' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    // Allowed fields to update
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email.toLowerCase();
    if (body.role !== undefined) {
      updates.role = body.role;
      updates.isAdmin = body.role === ROLES.ADMIN;
    }
    if (body.region !== undefined) updates.region = body.region;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;

    const result = await db.collection('advocates').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch updated user
    const updated = await db.collection('advocates').findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      _id: updated!._id.toString(),
      email: updated!.email || '',
      name: updated!.name || '',
      role: updated!.role || ROLES.ADVOCATE,
      roleLabel: ROLE_LABELS[(updated!.role as Role) || ROLES.ADVOCATE],
      region: updated!.region || '',
      isActive: updated!.isActive !== false,
      isAdmin: updated!.role === ROLES.ADMIN,
      updatedAt: updated!.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/admin/users/[id] error:', message);

    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/admin/users/[id] - Delete (deactivate) user
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const db = await getDb();

    const advocate = await db.collection('advocates').findOne({
      _id: new ObjectId(id),
    });

    if (!advocate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (advocate.email.toLowerCase() === admin.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Soft delete - just deactivate
    await db.collection('advocates').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date().toISOString(),
          deactivatedBy: admin.email,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/admin/users/[id] error:', message);

    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
