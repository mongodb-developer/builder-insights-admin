import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasRole, ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/feedback/forms/[id]/responses - List responses for a form
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!hasRole(session.role, ROLES.ADVOCATE)) {
      return NextResponse.json({ error: 'Advocate access required' }, { status: 403 });
    }

    const { id } = await context.params;

    // Check form access
    const formCol = await getCollection(collections.feedbackForms);
    const form = await formCol.findOne({ _id: id as any });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const isOwner = form.advocateId === session.advocateId || form.advocateId === session.email;
    if (!isOwner && !hasRole(session.role, ROLES.MANAGER)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const col = await getCollection(collections.feedbackResponses);
    const [responses, total] = await Promise.all([
      col.find({ formId: id }).sort({ submittedAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments({ formId: id }),
    ]);

    return NextResponse.json({ responses, total, limit, skip });
  } catch (error) {
    console.error('GET /api/feedback/forms/[id]/responses error:', error);
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
  }
}
