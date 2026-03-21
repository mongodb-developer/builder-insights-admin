import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

/**
 * POST /api/slack/digest - Post weekly digest to Slack
 * 
 * Can be called by a cron job or manually from admin UI.
 * Summarizes insights from the past week.
 */
export async function POST(request: NextRequest) {
  if (!SLACK_WEBHOOK_URL) {
    return NextResponse.json(
      { error: 'Slack webhook not configured' },
      { status: 503 }
    );
  }

  try {
    const col = await getCollection(collections.insights);
    
    // Get insights from the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const insights = await col.find({
      capturedAt: { $gte: oneWeekAgo.toISOString() }
    }).toArray();

    if (insights.length === 0) {
      // Still post a message but note no insights
      const noDataMessage = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📊 Weekly Builder Insights Digest',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '_No insights captured this week. Get out there and talk to developers!_ 🎯',
            },
          },
        ],
      };

      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noDataMessage),
      });

      return NextResponse.json({ success: true, insightCount: 0 });
    }

    // Calculate statistics
    const totalInsights = insights.length;
    
    // Sentiment breakdown
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    insights.forEach((i: any) => {
      if (i.sentiment === 'Positive') sentiment.positive++;
      else if (i.sentiment === 'Negative') sentiment.negative++;
      else sentiment.neutral++;
    });

    // Priority breakdown
    const priority = { critical: 0, high: 0, medium: 0, low: 0 };
    insights.forEach((i: any) => {
      if (i.priority === 'Critical') priority.critical++;
      else if (i.priority === 'High') priority.high++;
      else if (i.priority === 'Medium') priority.medium++;
      else priority.low++;
    });

    // Top product areas
    const productAreaCounts: Record<string, number> = {};
    insights.forEach((i: any) => {
      (i.productAreas || []).forEach((area: string) => {
        productAreaCounts[area] = (productAreaCounts[area] || 0) + 1;
      });
    });
    const topAreas = Object.entries(productAreaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top advocates
    const advocateCounts: Record<string, number> = {};
    insights.forEach((i: any) => {
      const name = i.advocateName || 'Unknown';
      advocateCounts[name] = (advocateCounts[name] || 0) + 1;
    });
    const topAdvocates = Object.entries(advocateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Top 3 high-priority insights
    const topInsights = insights
      .filter((i: any) => i.priority === 'Critical' || i.priority === 'High')
      .sort((a: any, b: any) => {
        const priorityOrder: Record<string, number> = { Critical: 0, High: 1 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      })
      .slice(0, 3);

    // Build Slack message
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
              text: '📊 Weekly Builder Insights Digest',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
              text: `*${totalInsights} insights* captured this week by the builder team! 🎉`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sentiment*\n😊 ${sentiment.positive} positive\n😐 ${sentiment.neutral} neutral\n😟 ${sentiment.negative} negative`,
            },
            {
              type: 'mrkdwn',
              text: `*Priority*\n🔴 ${priority.critical} critical\n🟠 ${priority.high} high\n🟡 ${priority.medium} medium\n⚪ ${priority.low} low`,
            },
          ],
        },
        ...(topAreas.length > 0 ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Top Product Areas*\n${topAreas.map(([area, count], i) => `${i + 1}. ${area} (${count})`).join('\n')}`,
            },
          },
        ] : []),
        ...(topAdvocates.length > 0 ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Top Contributors* 🏆\n${topAdvocates.map(([name, count], i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                return `${medal} ${name}: ${count} insights`;
              }).join('\n')}`,
            },
          },
        ] : []),
        ...(topInsights.length > 0 ? [
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*🔥 Top Priority Insights*',
            },
          },
          ...topInsights.map((insight: any) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${insight.priority === 'Critical' ? '🔴' : '🟠'} *${insight.type}*\n> ${insight.text.slice(0, 200)}${insight.text.length > 200 ? '...' : ''}\n_— ${insight.advocateName}${insight.eventName ? ` at ${insight.eventName}` : ''}_`,
            },
          })),
        ] : []),
        {
          type: 'divider',
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📅 Week of ${oneWeekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()} | <https://builder-insights-admin.vercel.app/executive|View Full Dashboard>`,
            },
          ],
        },
      ],
    };

    // Post to Slack
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Slack webhook error:', error);
      return NextResponse.json(
        { error: 'Failed to post to Slack' },
        { status: 502 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      insightCount: totalInsights,
      sentiment,
      priority,
    });
  } catch (error) {
    console.error('Slack digest error:', error);
    return NextResponse.json(
      { error: 'Failed to generate digest' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/slack/digest - Preview the digest without posting
 */
export async function GET() {
  try {
    const col = await getCollection(collections.insights);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const insights = await col.find({
      capturedAt: { $gte: oneWeekAgo.toISOString() }
    }).toArray();

    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    insights.forEach((i: any) => {
      if (i.sentiment === 'Positive') sentiment.positive++;
      else if (i.sentiment === 'Negative') sentiment.negative++;
      else sentiment.neutral++;
    });

    return NextResponse.json({
      configured: Boolean(SLACK_WEBHOOK_URL),
      preview: {
        insightCount: insights.length,
        weekStart: oneWeekAgo.toISOString(),
        weekEnd: new Date().toISOString(),
        sentiment,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
