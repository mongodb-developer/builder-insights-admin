import { NextRequest, NextResponse } from 'next/server';
import { isSlackConfigured, postToSlack } from '@/lib/slack';

export const dynamic = 'force-dynamic';

interface SlackInsight {
  type: string;
  text: string;
  sentiment: string;
  priority: string;
  productAreas: string[];
  tags: string[];
  eventName?: string;
  sessionTitle?: string;
  advocateName: string;
  location?: string;
  capturedAt: string;
}

/** Validate that the request body has the required fields with correct types. */
function validateInsight(body: unknown): { valid: true; data: SlackInsight } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  const requiredStrings = ['type', 'text', 'sentiment', 'priority', 'advocateName', 'capturedAt'] as const;
  for (const field of requiredStrings) {
    if (typeof b[field] !== 'string' || (b[field] as string).trim() === '') {
      return { valid: false, error: `Missing or invalid required field: ${field}` };
    }
  }

  const requiredArrays = ['productAreas', 'tags'] as const;
  for (const field of requiredArrays) {
    if (!Array.isArray(b[field])) {
      return { valid: false, error: `Missing or invalid required field: ${field} (must be an array)` };
    }
  }

  return { valid: true, data: body as SlackInsight };
}

/**
 * POST /api/slack/post - Post an insight to Slack
 */
export async function POST(request: NextRequest) {
  if (!isSlackConfigured()) {
    return NextResponse.json(
      { error: 'Slack webhook not configured' },
      { status: 503 }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const result = validateInsight(body);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const insight = result.data;

  try {
    // Build Slack message with blocks for rich formatting
    const sentimentEmoji =
      insight.sentiment === 'Positive' ? '😊' :
      insight.sentiment === 'Negative' ? '😟' : '😐';

    const priorityEmoji =
      insight.priority === 'Critical' ? '🔴' :
      insight.priority === 'High' ? '🟠' :
      insight.priority === 'Medium' ? '🟡' : '⚪';

    const capturedDate = new Date(insight.capturedAt);
    const formattedDate = capturedDate.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${sentimentEmoji} New Insight: ${insight.type}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> ${insight.text}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sentiment:*\n${sentimentEmoji} ${insight.sentiment}`,
            },
            {
              type: 'mrkdwn',
              text: `*Priority:*\n${priorityEmoji} ${insight.priority}`,
            },
            {
              type: 'mrkdwn',
              text: `*Product Areas:*\n${insight.productAreas.join(', ') || 'None'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Captured By:*\n${insight.advocateName}`,
            },
          ],
        },
        ...(insight.eventName ? [{
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📍 *Event:* ${insight.eventName}${insight.location ? ` (${insight.location})` : ''}${insight.sessionTitle ? ` • ${insight.sessionTitle}` : ''}`,
            },
          ],
        }] : []),
        ...(insight.tags.length > 0 ? [{
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🏷️ ${insight.tags.map(t => `\`${t}\``).join(' ')}`,
            },
          ],
        }] : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_Captured ${formattedDate}_`,
            },
          ],
        },
      ],
    };

    // Post to Slack with timeout
    const response = await postToSlack(slackMessage);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack webhook error:', errorText);
      return NextResponse.json(
        { error: 'Failed to post to Slack', detail: errorText },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Slack webhook timed out');
      return NextResponse.json(
        { error: 'Slack webhook request timed out' },
        { status: 504 }
      );
    }
    console.error('Slack post error:', error);
    return NextResponse.json(
      { error: 'Failed to post to Slack' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/slack/post - Check if Slack is configured
 */
export async function GET() {
  return NextResponse.json({
    configured: isSlackConfigured(),
  });
}
