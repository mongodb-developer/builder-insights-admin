import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection, collections } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasRole, ROLES } from '@/lib/roles';
import {
  generateSlug,
  createQuestionsFromTemplate,
  FORM_TEMPLATES,
} from '@/lib/feedback-forms';
import type { FeedbackFormTemplate, FeedbackFormStatus } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/feedback/forms - List feedback forms
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as FeedbackFormStatus | null;
    const eventId = searchParams.get('eventId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const col = await getCollection(collections.feedbackForms);

    const filter: Record<string, unknown> = {};

    // Non-managers can only see their own forms
    if (!hasRole(session.role, ROLES.MANAGER)) {
      filter.advocateId = session.advocateId;
    }

    if (status) filter.status = status;
    if (eventId) filter.eventId = eventId;

    const [forms, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({ forms, total, limit, skip });
  } catch (error) {
    console.error('GET /api/feedback/forms error:', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

// POST /api/feedback/forms - Create a new feedback form
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!hasRole(session.role, ROLES.ADVOCATE)) {
      return NextResponse.json({ error: 'Advocate access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      template,
      eventId,
      sessionId,
      eventName,
      sessionTitle,
      questions: customQuestions,
      settings: customSettings,
    } = body;

    // Validate template
    const templateId = (template || 'general_feedback') as FeedbackFormTemplate;
    if (!FORM_TEMPLATES[templateId]) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
    }

    const tmpl = FORM_TEMPLATES[templateId];
    const now = new Date().toISOString();

    // Use custom questions if provided (for hybrid customization), otherwise use template defaults
    const questions = customQuestions || createQuestionsFromTemplate(templateId);

    // Generate a unique slug
    const col = await getCollection(collections.feedbackForms);
    let slug = generateSlug(title || tmpl.defaultTitle);

    // Ensure slug uniqueness
    let existing = await col.findOne({ slug });
    let attempts = 0;
    while (existing && attempts < 5) {
      slug = generateSlug(title || tmpl.defaultTitle);
      existing = await col.findOne({ slug });
      attempts++;
    }

    const form = {
      _id: new ObjectId().toString(),
      title: title || tmpl.defaultTitle,
      description: description ?? tmpl.defaultDescription,
      status: 'draft' as const,
      template: templateId,

      // Context
      eventId: eventId || null,
      sessionId: sessionId || null,
      eventName: eventName || null,
      sessionTitle: sessionTitle || null,
      advocateId: session.advocateId || session.email,
      advocateName: session.name,

      // Form definition
      questions,

      // Settings
      settings: {
        ...tmpl.defaultSettings,
        ...customSettings,
      },

      // Sharing
      slug,

      // Stats
      responseCount: 0,
      lastResponseAt: null,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    };

    await col.insertOne(form as any);

    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    console.error('POST /api/feedback/forms error:', error);
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}
