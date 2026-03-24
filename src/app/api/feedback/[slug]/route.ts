import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

// GET /api/feedback/[slug] - Get public form definition (no auth required)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const col = await getCollection(collections.feedbackForms);
    const form = await col.findOne({ slug });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Only return active forms to the public
    if (form.status !== 'active') {
      if (form.status === 'closed') {
        return NextResponse.json(
          { error: 'This form is no longer accepting responses', closed: true },
          { status: 410 }
        );
      }
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check if max responses reached
    if (form.settings?.maxResponses && form.responseCount >= form.settings.maxResponses) {
      return NextResponse.json(
        { error: 'This form has reached its maximum number of responses', closed: true },
        { status: 410 }
      );
    }

    // Check if form has expired
    if (form.settings?.closesAt && new Date(form.settings.closesAt) < new Date()) {
      return NextResponse.json(
        { error: 'This form is no longer accepting responses', closed: true },
        { status: 410 }
      );
    }

    // Return sanitized form data (no internal fields)
    return NextResponse.json({
      _id: form._id,
      title: form.title,
      description: form.description,
      questions: form.questions,
      settings: {
        collectName: form.settings?.collectName ?? true,
        collectEmail: form.settings?.collectEmail ?? true,
        thankYouMessage: form.settings?.thankYouMessage,
      },
      eventName: form.eventName,
      sessionTitle: form.sessionTitle,
      advocateName: form.advocateName,
    });
  } catch (error) {
    console.error('GET /api/feedback/[slug] error:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}
