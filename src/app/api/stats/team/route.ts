/**
 * Team Stats API
 * 
 * Returns aggregated statistics for the executive dashboard.
 * Used by managers to see team-wide insights and activity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    const db = await getDb();
    const now = new Date();
    
    // Calculate date ranges
    const periodDays = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    }[period] || 7;

    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Total counts
    const [totalInsights, totalEvents, totalAdvocates] = await Promise.all([
      db.collection('insights').countDocuments(),
      db.collection('events').countDocuments(),
      db.collection('advocates').countDocuments(),
    ]);

    // This week vs last week
    const [insightsThisWeek, insightsLastWeek] = await Promise.all([
      db.collection('insights').countDocuments({
        capturedAt: { $gte: weekStart.toISOString() },
      }),
      db.collection('insights').countDocuments({
        capturedAt: { $gte: lastWeekStart.toISOString(), $lt: weekStart.toISOString() },
      }),
    ]);

    const weekOverWeekChange = insightsLastWeek > 0
      ? Math.round(((insightsThisWeek - insightsLastWeek) / insightsLastWeek) * 100)
      : insightsThisWeek > 0 ? 100 : 0;

    // Sentiment breakdown
    const sentimentAgg = await db.collection('insights').aggregate([
      { $match: { capturedAt: { $gte: periodStart.toISOString() } } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
    ]).toArray();

    const bySentiment: Record<string, number> = {};
    sentimentAgg.forEach((s) => {
      bySentiment[s._id || 'Unknown'] = s.count;
    });

    // Product area breakdown
    const productAreaAgg = await db.collection('insights').aggregate([
      { $match: { capturedAt: { $gte: periodStart.toISOString() } } },
      { $unwind: '$productAreas' },
      { $group: { _id: '$productAreas', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    const byProductArea: Record<string, number> = {};
    productAreaAgg.forEach((p) => {
      byProductArea[p._id] = p.count;
    });

    // By advocate
    const advocateAgg = await db.collection('insights').aggregate([
      { $match: { capturedAt: { $gte: periodStart.toISOString() } } },
      {
        $group: {
          _id: '$advocateId',
          advocateName: { $first: '$advocateName' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]).toArray();

    const byAdvocate = advocateAgg.map((a) => ({
      advocateId: a._id,
      advocateName: a.advocateName || 'Unknown',
      count: a.count,
    }));

    // Top tags
    const tagAgg = await db.collection('insights').aggregate([
      { $match: { capturedAt: { $gte: periodStart.toISOString() } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]).toArray();

    const topTags = tagAgg.map((t) => ({
      tag: t._id,
      count: t.count,
    }));

    // Recent activity
    const recentInsights = await db.collection('insights')
      .find()
      .sort({ capturedAt: -1 })
      .limit(10)
      .project({ advocateName: 1, type: 1, capturedAt: 1 })
      .toArray();

    const recentActivity = recentInsights.map((i) => ({
      advocateName: i.advocateName || 'Unknown',
      action: `captured a ${i.type || 'insight'}`,
      timestamp: i.capturedAt,
    }));

    return NextResponse.json({
      totalInsights,
      totalAdvocates,
      totalEvents,
      insightsThisWeek,
      insightsLastWeek,
      weekOverWeekChange,
      bySentiment,
      byProductArea,
      byAdvocate,
      topTags,
      recentActivity,
      period,
      periodStart: periodStart.toISOString(),
    });
  } catch (error) {
    console.error('Team stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team stats' },
      { status: 500 }
    );
  }
}
