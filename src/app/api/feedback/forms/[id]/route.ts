import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasRole, ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// Helper to check ownership or manager+ access
async function checkFormAccess(formId: string, session: { role: string; advocateId?: string | null; email: string }) {
  const col = await getCollection(collections.feedbackForms);
  const form = await col.findOne({ _id: formId as any });
  if (!form) return { form: null, error: 'Form not found', status: 404 };

  const isOwner = form.advocateId === session.advocateId || form.advocateId === session.email;
  const isManagerPlus = hasRole(session.role, ROLES.MANAGER);

  if (!isOwner && !isManagerPlus) {
    return { form: null, error: 'You do not have access to this form', status: 403 };
  }

  return { form, error: null, status: 200 };
}

// GET /api/feedback/forms/[id] - Get a single form
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const { form, error, status } = await checkFormAccess(id, session);
    if (!form) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('GET /api/feedback/forms/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}

// PUT /api/feedback/forms/[id] - Update a form
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!hasRole(session.role, ROLES.ADVOCATE)) {
      return NextResponse.json({ error: 'Advocate access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const { form, error, status } = await checkFormAccess(id, session);
    if (!form) {
      return NextResponse.json({ error }, { status });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    // Fields that can be updated
    const updates: Record<string, unknown> = { updatedAt: now };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) {
      if (!['draft', 'active', 'closed'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.questions !== undefined) updates.questions = body.questions;
    if (body.settings !== undefined) updates.settings = { ...form.settings, ...body.settings };
    if (body.eventId !== undefined) updates.eventId = body.eventId;
    if (body.sessionId !== undefined) updates.sessionId = body.sessionId;
    if (body.eventName !== undefined) updates.eventName = body.eventName;
    if (body.sessionTitle !== undefined) updates.sessionTitle = body.sessionTitle;

    const col = await getCollection(collections.feedbackForms);
    await col.updateOne({ _id: id as any }, { $set: updates });

    const updated = await col.findOne({ _id: id as any });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/feedback/forms/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
  }
}

// DELETE /api/feedback/forms/[id] - Delete a form
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!hasRole(session.role, ROLES.ADVOCATE)) {
      return NextResponse.json({ error: 'Advocate access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const { form, error, status } = await checkFormAccess(id, session);
    if (!form) {
      return NextResponse.json({ error }, { status });
    }

    // Don't allow deleting active forms with responses
    if (form.status === 'active' && form.responseCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete an active form with responses. Close it first.' },
        { status: 400 }
      );
    }

    const col = await getCollection(collections.feedbackForms);
    await col.deleteOne({ _id: id as any });

    // Also delete associated responses
    const responseCol = await getCollection(collections.feedbackResponses);
    await responseCol.deleteMany({ formId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/feedback/forms/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}
