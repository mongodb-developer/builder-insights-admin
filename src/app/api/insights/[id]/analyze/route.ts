/**
 * AI Analysis Endpoint for Insights
 * 
 * POST /api/insights/[id]/analyze - Generate AI analysis for an insight
 * GET /api/insights/[id]/analyze - Get existing analysis (if any)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, collections } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { Priority, InsightAIAnalysis } from '@/types';
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

// System prompt for insight analysis
const SYSTEM_PROMPT = `You are an expert Developer Relations analyst at MongoDB. Your job is to analyze developer feedback (insights) captured at conferences, meetups, and customer interactions.

For each insight, provide:
1. A concise summary (1-2 sentences max)
2. An interpretation of what the developer really means or needs
3. 2-4 specific, actionable suggested next steps
4. 3-5 themes/topics extracted from the insight
5. A priority recommendation (Low, Medium, High, or Critical) with reasoning
6. Why you classified the sentiment the way you did
7. Any additional MongoDB product areas mentioned beyond what was tagged
8. A confidence score (0-1) for your analysis

Be specific, practical, and focused on actionable outcomes. Consider:
- Is this a common pain point or unique edge case?
- What's the business impact for the developer?
- What team at MongoDB should care about this?
- Is there an existing solution the developer might not know about?

Respond ONLY with valid JSON matching this schema:
{
  "summary": "string",
  "interpretation": "string", 
  "suggestedActions": ["string"],
  "themes": ["string"],
  "prioritySuggestion": "Low" | "Medium" | "High" | "Critical",
  "sentimentReason": "string",
  "relatedProductAreas": ["string"],
  "confidence": number
}`;

function buildUserPrompt(insight: any): string {
  const parts = [
    `**Insight Type:** ${insight.type}`,
    `**Current Priority:** ${insight.priority}`,
    `**Current Sentiment:** ${insight.sentiment}`,
    `**Product Areas:** ${insight.productAreas?.join(', ') || 'None specified'}`,
    `**Tags:** ${insight.tags?.join(', ') || 'None'}`,
  ];

  if (insight.eventName) {
    parts.push(`**Event:** ${insight.eventName}`);
  }
  
  if (insight.eventContext) {
    if (insight.eventContext.region) parts.push(`**Region:** ${insight.eventContext.region}`);
    if (insight.eventContext.accountSegment) parts.push(`**Account Segment:** ${insight.eventContext.accountSegment}`);
    if (insight.eventContext.technicalTheme) parts.push(`**Technical Theme:** ${insight.eventContext.technicalTheme}`);
  }

  parts.push('', '**Developer Feedback:**', insight.text);

  if (insight.annotations?.length > 0) {
    parts.push('', '**Team Annotations:**');
    insight.annotations.forEach((a: any) => {
      parts.push(`- ${a.advocateName}: ${a.text}`);
    });
  }

  return parts.join('\n');
}

// Helper to find insight by ID (handles both string and ObjectId)
async function findInsightById(db: any, id: string) {
  // Try as string first (most common in this app)
  let insight = await db.collection(collections.insights).findOne({ _id: id });
  
  // If not found and valid ObjectId format, try as ObjectId
  if (!insight && ObjectId.isValid(id)) {
    insight = await db.collection(collections.insights).findOne({ _id: new ObjectId(id) });
  }
  
  return insight;
}

// GET - Retrieve existing analysis
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid insight ID' }, { status: 400 });
    }

    const db = await getDb();
    const insight = await findInsightById(db, id);

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    if (!insight.aiAnalysis) {
      return NextResponse.json({ 
        hasAnalysis: false,
        message: 'No AI analysis yet. POST to generate one.' 
      });
    }

    return NextResponse.json({
      hasAnalysis: true,
      analysis: insight.aiAnalysis,
    });

  } catch (error) {
    console.error('[GET /api/insights/[id]/analyze]', error);
    return NextResponse.json({ error: 'Failed to get analysis' }, { status: 500 });
  }
}

// POST - Generate new analysis
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const forceRefresh = body.refresh === true;

    if (!id) {
      return NextResponse.json({ error: 'Invalid insight ID' }, { status: 400 });
    }

    const db = await getDb();
    const insight = await findInsightById(db, id);

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Return existing analysis unless force refresh
    if (insight.aiAnalysis && !forceRefresh) {
      return NextResponse.json({
        hasAnalysis: true,
        analysis: insight.aiAnalysis,
        cached: true,
      });
    }

    // Generate new analysis with OpenAI
    console.log(`[AI Analysis] Generating for insight ${id}...`);
    const startTime = Date.now();

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(insight) },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const aiResult = JSON.parse(responseText);
    
    // Build the analysis object
    const analysis: InsightAIAnalysis = {
      summary: aiResult.summary || '',
      interpretation: aiResult.interpretation || '',
      suggestedActions: aiResult.suggestedActions || [],
      themes: aiResult.themes || [],
      prioritySuggestion: aiResult.prioritySuggestion as Priority || insight.priority,
      sentimentReason: aiResult.sentimentReason || '',
      relatedProductAreas: aiResult.relatedProductAreas || [],
      confidence: typeof aiResult.confidence === 'number' ? aiResult.confidence : 0.8,
      analyzedAt: new Date().toISOString(),
      model: 'gpt-4o-mini',
    };

    // Save to database (use the actual _id from the found document)
    await db.collection(collections.insights).updateOne(
      { _id: insight._id },
      { 
        $set: { 
          aiAnalysis: analysis,
          updatedAt: new Date().toISOString(),
        } 
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`[AI Analysis] Complete for ${id} in ${elapsed}ms`);

    return NextResponse.json({
      hasAnalysis: true,
      analysis,
      cached: false,
      generatedIn: elapsed,
      tokensUsed: completion.usage?.total_tokens,
    });

  } catch (error) {
    console.error('[POST /api/insights/[id]/analyze]', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate analysis' 
    }, { status: 500 });
  }
}
