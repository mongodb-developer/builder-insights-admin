import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { createHash } from 'crypto';
import { getCollection, collections } from '@/lib/mongodb';
import { mapResponsesToInsightData } from '@/lib/feedback-forms';
import type { FeedbackResponseAnswer } from '@/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Hash an IP address for rate limiting without storing raw IPs.
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.AUTH_SECRET || 'salt')).digest('hex');
}

// POST /api/feedback/[slug]/submit - Submit a form response (public, rate-limited)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = await request.json();

    // Honeypot field — if filled, it's a bot
    if (body.website) {
      // Silently accept but discard
      return NextResponse.json({ success: true, message: 'Thank you for your feedback!' });
    }

    const {
      answers,
      respondentName,
      respondentEmail,
    } = body as {
      answers: FeedbackResponseAnswer[];
      respondentName?: string;
      respondentEmail?: string;
    };

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
    }

    // Fetch the form
    const formCol = await getCollection(collections.feedbackForms);
    const form = await formCol.findOne({ slug });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (form.status !== 'active') {
      return NextResponse.json(
        { error: 'This form is no longer accepting responses' },
        { status: 410 }
      );
    }

    // Check max responses
    if (form.settings?.maxResponses && form.responseCount >= form.settings.maxResponses) {
      return NextResponse.json(
        { error: 'This form has reached its maximum number of responses' },
        { status: 410 }
      );
    }

    // Check expiry
    if (form.settings?.closesAt && new Date(form.settings.closesAt) < new Date()) {
      return NextResponse.json(
        { error: 'This form is no longer accepting responses' },
        { status: 410 }
      );
    }

    // Rate limiting: 5 submissions per form per IP per hour
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const ipHash = hashIp(ip);

    const responseCol = await getCollection(collections.feedbackResponses);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const recentSubmissions = await responseCol.countDocuments({
      formId: form._id,
      ipHash,
      submittedAt: { $gte: oneHourAgo },
    });

    if (recentSubmissions >= 5) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate required questions
    const requiredQuestionIds = form.questions
      .filter((q: any) => q.required)
      .map((q: any) => q._id);

    const answeredIds = new Set(answers.map((a) => a.questionId));
    const missingRequired = requiredQuestionIds.filter((id: string) => {
      if (!answeredIds.has(id)) return true;
      const answer = answers.find((a) => a.questionId === id);
      if (!answer) return true;
      // Check for empty values
      const val = answer.value;
      if (val === '' || val === null || val === undefined) return true;
      if (Array.isArray(val) && val.length === 0) return true;
      return false;
    });

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { error: 'Please answer all required questions', missingQuestions: missingRequired },
        { status: 400 }
      );
    }

    // Map answers to insight data
    const insightData = mapResponsesToInsightData(form.questions, answers);

    const now = new Date().toISOString();
    const insightId = new ObjectId().toString();
    const responseId = new ObjectId().toString();

    // Create the Insight
    const insightCol = await getCollection(collections.insights);
    const insight = {
      _id: insightId,
      ...insightData,
      // Context from form
      eventId: form.eventId || null,
      eventName: form.eventName || null,
      sessionId: form.sessionId || null,
      sessionTitle: form.sessionTitle || null,
      // Attribution
      advocateId: form.advocateId,
      advocateName: form.advocateName,
      // Source tracking
      source: 'feedback_form',
      feedbackFormId: form._id,
      respondent: {
        name: respondentName || null,
        email: respondentEmail || null,
      },
      // Defaults
      attachments: [],
      upvotes: [],
      annotations: [],
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
      synced: true,
    };

    await insightCol.insertOne(insight as any);

    // Create the FeedbackResponse
    const feedbackResponse = {
      _id: responseId,
      formId: form._id,
      respondentName: respondentName || null,
      respondentEmail: respondentEmail || null,
      answers,
      insightId,
      submittedAt: now,
      ipHash,
    };

    await responseCol.insertOne(feedbackResponse as any);

    // Update form stats (fire-and-forget)
    formCol.updateOne(
      { _id: form._id },
      {
        $inc: { responseCount: 1 },
        $set: { lastResponseAt: now, updatedAt: now },
      }
    ).catch((err) => console.error('Failed to update form stats:', err));

    // Update event insight count if linked (fire-and-forget)
    if (form.eventId) {
      const eventsCol = await getCollection(collections.events);
      eventsCol.updateOne(
        { _id: form.eventId },
        { $inc: { insightCount: 1 } }
      ).catch((err) => console.error('Failed to update event count:', err));
    }

    return NextResponse.json({
      success: true,
      message: form.settings?.thankYouMessage || 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('POST /api/feedback/[slug]/submit error:', error);
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
  }
}
