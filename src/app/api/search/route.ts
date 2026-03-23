/**
 * Unified Search API
 * 
 * Searches across events, insights, advocates, and bugs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface SearchResult {
  _id: string;
  type: 'event' | 'insight' | 'advocate' | 'bug';
  title: string;
  subtitle?: string;
  snippet?: string;
  url: string;
  meta?: Record<string, any>;
  score?: number;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  counts: {
    events: number;
    insights: number;
    advocates: number;
    bugs: number;
    total: number;
  };
  took: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const types = searchParams.get('types')?.split(',') || ['event', 'insight', 'advocate', 'bug'];
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        error: 'Query must be at least 2 characters' 
      }, { status: 400 });
    }

    const startTime = Date.now();
    const db = await getDb();
    const results: SearchResult[] = [];
    const counts = { events: 0, insights: 0, advocates: 0, bugs: 0, total: 0 };

    // Build regex for case-insensitive search
    const regex = new RegExp(query, 'i');

    // Search Events
    if (types.includes('event')) {
      const events = await db.collection(collections.events)
        .find({
          $or: [
            { name: regex },
            { 'account.name': regex },
            { location: regex },
            { notes: regex },
            { 'champion.name': regex },
            { marketer: regex },
          ]
        })
        .limit(limit)
        .toArray();

      counts.events = events.length;
      
      for (const event of events) {
        results.push({
          _id: event._id.toString(),
          type: 'event',
          title: event.name || 'Untitled Event',
          subtitle: `${event.eventType} • ${event.status}`,
          snippet: event.account?.name 
            ? `${event.account.name} - ${event.location || 'No location'}`
            : event.location || undefined,
          url: `/events/${event._id}`,
          meta: {
            status: event.status,
            eventType: event.eventType,
            startDate: event.startDate,
            quarter: event.quarter,
          }
        });
      }
    }

    // Search Insights
    if (types.includes('insight')) {
      const insights = await db.collection(collections.insights)
        .find({
          $or: [
            { text: regex },
            { title: regex },
            { 'aiDistillation.summary': regex },
            { tags: regex },
            { eventName: regex },
            { productAreas: regex },
            { advocateName: regex },
          ]
        })
        .limit(limit)
        .toArray();

      counts.insights = insights.length;

      for (const insight of insights) {
        results.push({
          _id: insight._id.toString(),
          type: 'insight',
          title: insight.title || (insight.text?.substring(0, 100) + (insight.text?.length > 100 ? '...' : '')) || 'No text',
          subtitle: `${insight.type} • ${insight.sentiment} • ${insight.priority}`,
          snippet: insight.eventName 
            ? `From: ${insight.eventName}` 
            : insight.productAreas?.length 
              ? `Products: ${insight.productAreas.join(', ')}`
              : undefined,
          url: `/insights?highlight=${insight._id}`,
          meta: {
            type: insight.type,
            sentiment: insight.sentiment,
            priority: insight.priority,
            advocateName: insight.advocateName,
            capturedAt: insight.capturedAt,
          }
        });
      }
    }

    // Search Advocates
    if (types.includes('advocate')) {
      const advocates = await db.collection(collections.advocates)
        .find({
          $or: [
            { name: regex },
            { email: regex },
            { role: regex },
          ]
        })
        .limit(limit)
        .toArray();

      counts.advocates = advocates.length;

      for (const advocate of advocates) {
        results.push({
          _id: advocate._id.toString(),
          type: 'advocate',
          title: advocate.name || advocate.email,
          subtitle: advocate.role || 'Advocate',
          snippet: `${advocate.region || 'Unknown region'} • ${advocate.insightCount || 0} insights`,
          url: `/advocates?highlight=${advocate._id}`,
          meta: {
            email: advocate.email,
            region: advocate.region,
            insightCount: advocate.insightCount,
            eventCount: advocate.eventCount,
          }
        });
      }
    }

    // Search Bugs
    if (types.includes('bug')) {
      const bugs = await db.collection(collections.bugs)
        .find({
          $or: [
            { title: regex },
            { description: regex },
            { reproSteps: regex },
            { reporterName: regex },
          ]
        })
        .limit(limit)
        .toArray();

      counts.bugs = bugs.length;

      for (const bug of bugs) {
        results.push({
          _id: bug._id.toString(),
          type: 'bug',
          title: bug.title || 'Untitled Bug',
          subtitle: `${bug.status} • ${bug.priority}`,
          snippet: bug.description?.substring(0, 150) + (bug.description?.length > 150 ? '...' : ''),
          url: `/bugs?highlight=${bug._id}`,
          meta: {
            status: bug.status,
            priority: bug.priority,
            reporterName: bug.reporterName,
            createdAt: bug.createdAt,
          }
        });
      }
    }

    counts.total = results.length;
    const took = Date.now() - startTime;

    const response: SearchResponse = {
      query,
      results,
      counts,
      took,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
