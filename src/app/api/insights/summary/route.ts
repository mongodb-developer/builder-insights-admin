import { NextRequest, NextResponse } from 'next/server';
import { getCollection, collections, getDb } from '@/lib/mongodb';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// Lazy-init OpenAI client to avoid build-time errors when API key is missing
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// GET /api/insights/summary - Get cached summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'quarter';

    const db = await getDb();
    const cached = await db.collection('summaries').findOne(
      { period },
      { sort: { generatedAt: -1 } }
    );

    if (!cached) {
      return NextResponse.json({ cached: null });
    }

    // Calculate age
    const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);

    let ageText: string;
    if (ageDays > 0) {
      ageText = `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
    } else if (ageHours > 0) {
      ageText = `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
    } else {
      const ageMinutes = Math.floor(ageMs / (1000 * 60));
      ageText = `${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago`;
    }

    return NextResponse.json({
      cached: {
        ...cached,
        ageText,
        ageMs,
      },
    });
  } catch (error) {
    console.error('GET /api/insights/summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch cached summary' }, { status: 500 });
  }
}

// POST /api/insights/summary - Generate AI executive summary
export async function POST(request: NextRequest) {
  try {
    const { period = 'quarter', forceNew = false } = await request.json().catch(() => ({}));

    const db = await getDb();

    // Check for recent cache (less than 1 hour old) unless forcing new
    if (!forceNew) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCache = await db.collection('summaries').findOne({
        period,
        generatedAt: { $gte: oneHourAgo },
      });

      if (recentCache) {
        return NextResponse.json({
          ...recentCache,
          fromCache: true,
        });
      }
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'This Week';
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = 'This Month';
        break;
      case 'quarter':
      default:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        periodLabel = 'This Quarter';
        break;
    }

    const insightsCol = await getCollection(collections.insights);
    const eventsCol = await getCollection(collections.events);

    // Fetch insights for the period
    const insights = await insightsCol
      .find({ capturedAt: { $gte: startDate.toISOString() } })
      .sort({ capturedAt: -1 })
      .toArray();

    if (insights.length === 0) {
      return NextResponse.json({
        summary: `No insights were captured during ${periodLabel.toLowerCase()}. The Builder Insights app is ready to collect developer feedback at your next event.`,
        stats: { total: 0, events: 0, advocates: 0 },
        period: periodLabel,
        generatedAt: now.toISOString(),
      });
    }

    // Aggregate stats
    const eventIds = [...new Set(insights.map((i: any) => i.eventId).filter(Boolean))];
    const advocateIds = [...new Set(insights.map((i: any) => i.advocateId).filter(Boolean))];
    
    const byType: Record<string, number> = {};
    const bySentiment: Record<string, number> = {};
    const byProductArea: Record<string, number> = {};
    const featureRequests: string[] = [];
    const painPoints: string[] = [];
    const competitiveIntel: string[] = [];
    const positiveFeedback: string[] = [];

    insights.forEach((insight: any) => {
      // Count by type
      byType[insight.type] = (byType[insight.type] || 0) + 1;
      
      // Count by sentiment
      bySentiment[insight.sentiment] = (bySentiment[insight.sentiment] || 0) + 1;
      
      // Count by product area
      (insight.productAreas || []).forEach((area: string) => {
        byProductArea[area] = (byProductArea[area] || 0) + 1;
      });

      // Collect key insights by type
      if (insight.type === 'Feature Request' && featureRequests.length < 15) {
        featureRequests.push(insight.text);
      } else if (insight.type === 'Pain Point' && painPoints.length < 10) {
        painPoints.push(insight.text);
      } else if (insight.type === 'Competitive Intel' && competitiveIntel.length < 10) {
        competitiveIntel.push(insight.text);
      } else if (insight.type === 'Positive Feedback' && positiveFeedback.length < 10) {
        positiveFeedback.push(insight.text);
      }
    });

    // Build prompt for GPT
    const prompt = `You are writing an executive summary for MongoDB Developer Relations leadership and Marketing/CMO. 
This summary will be used in quarterly reviews to demonstrate the value of DevRel activities.

PERIOD: ${periodLabel}
TOTAL INSIGHTS CAPTURED: ${insights.length}
EVENTS COVERED: ${eventIds.length}
ADVOCATES CONTRIBUTING: ${advocateIds.length}

INSIGHTS BY TYPE:
${Object.entries(byType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

SENTIMENT BREAKDOWN:
${Object.entries(bySentiment).map(([sentiment, count]) => `- ${sentiment}: ${count}`).join('\n')}

TOP PRODUCT AREAS MENTIONED:
${Object.entries(byProductArea).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([area, count]) => `- ${area}: ${count} mentions`).join('\n')}

FEATURE REQUESTS FROM DEVELOPERS:
${featureRequests.map((r, i) => `${i + 1}. "${r}"`).join('\n')}

PAIN POINTS DEVELOPERS MENTIONED:
${painPoints.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

COMPETITIVE INTELLIGENCE:
${competitiveIntel.length > 0 ? competitiveIntel.map((c, i) => `${i + 1}. "${c}"`).join('\n') : 'No competitive intel captured this period.'}

POSITIVE FEEDBACK:
${positiveFeedback.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

Write a 4-5 paragraph executive summary that:
1. Opens with a high-level overview of DevRel's developer engagement this period
2. Highlights the top 3-4 actionable themes from the insights (what developers want/need)
3. Calls out any notable competitive intelligence
4. Summarizes developer sentiment and what's working well
5. Ends with 2-3 recommended actions based on the data

Use a professional but engaging tone. Include specific numbers. This should feel data-driven and valuable to a CMO who wants to understand if DevRel investment is paying off.

Do NOT use markdown formatting like ** or headers. Write in plain paragraphs.`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing developer feedback and writing executive summaries for technical leadership.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const summary = completion.choices[0]?.message?.content || 'Failed to generate summary.';

    // Generate key themes
    const themesPrompt = `Based on these developer insights, list the top 5 emerging themes in 5 words or less each. Just list them, one per line, no numbers or bullets:

Feature Requests: ${featureRequests.slice(0, 8).join(' | ')}
Pain Points: ${painPoints.slice(0, 5).join(' | ')}`;

    const themesCompletion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: themesPrompt }],
      temperature: 0.5,
      max_tokens: 100,
    });

    const themes = (themesCompletion.choices[0]?.message?.content || '')
      .split('\n')
      .filter((t) => t.trim())
      .slice(0, 5);

    // Build the response object
    const responseData = {
      summary,
      themes,
      stats: {
        total: insights.length,
        events: eventIds.length,
        advocates: advocateIds.length,
        byType,
        bySentiment,
        topProductAreas: Object.entries(byProductArea)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([area, count]) => ({ area, count })),
      },
      period: periodLabel,
      generatedAt: now.toISOString(),
      fromCache: false,
    };

    // Save to cache
    await db.collection('summaries').insertOne({
      ...responseData,
      period,
      createdAt: now,
    });

    // Clean up old summaries (keep last 10 per period)
    const oldSummaries = await db.collection('summaries')
      .find({ period })
      .sort({ generatedAt: -1 })
      .skip(10)
      .toArray();
    
    if (oldSummaries.length > 0) {
      await db.collection('summaries').deleteMany({
        _id: { $in: oldSummaries.map((s) => s._id) },
      });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary. Please try again.' },
      { status: 500 }
    );
  }
}
