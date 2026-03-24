/**
 * Monitoring Dashboard API
 *
 * Aggregates telemetry data for the /monitoring page.
 * Returns four sections matching the dashboard tabs:
 *   1. overview  — headline KPIs and trend sparklines
 *   2. users     — geographic distribution (reuses user_locations + analytics_pings)
 *   3. features  — screen views and feature usage counts
 *   4. health    — API success rates, latency percentiles, error breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const section = searchParams.get('section') || 'all';

    const db = await getDb();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const telemetry = db.collection('telemetry_events');

    const result: Record<string, unknown> = { since: since.toISOString(), hours };

    // ------------------------------------------------------------------
    // OVERVIEW — headline KPIs
    // ------------------------------------------------------------------
    if (section === 'all' || section === 'overview') {
      const [
        totalEvents,
        uniqueUsers,
        uniqueSessions,
        appVersions,
        platformSplit,
        activityTimeline,
      ] = await Promise.all([
        // Total telemetry events in window
        telemetry.countDocuments({ eventTimestamp: { $gte: since } }),

        // Distinct users
        telemetry.distinct('userId', {
          eventTimestamp: { $gte: since },
          userId: { $ne: null },
        }),

        // Distinct sessions (cold starts)
        telemetry.distinct('sessionId', {
          eventTimestamp: { $gte: since },
        }),

        // App version distribution
        telemetry.aggregate([
          { $match: { eventTimestamp: { $gte: since }, appVersion: { $ne: null } } },
          { $group: { _id: '$appVersion', users: { $addToSet: '$userId' } } },
          { $project: { version: '$_id', count: { $size: '$users' }, _id: 0 } },
          { $sort: { count: -1 } },
        ]).toArray(),

        // Platform split
        telemetry.aggregate([
          { $match: { eventTimestamp: { $gte: since }, platform: { $ne: null } } },
          { $group: { _id: '$platform', users: { $addToSet: '$userId' } } },
          { $project: { platform: '$_id', count: { $size: '$users' }, _id: 0 } },
          { $sort: { count: -1 } },
        ]).toArray(),

        // Activity timeline (events per hour)
        telemetry.aggregate([
          { $match: { eventTimestamp: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$eventTimestamp' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { hour: '$_id', count: 1, _id: 0 } },
        ]).toArray(),
      ]);

      result.overview = {
        totalEvents,
        uniqueUsers: uniqueUsers.length,
        uniqueSessions: uniqueSessions.length,
        appVersions,
        platformSplit,
        activityTimeline,
      };
    }

    // ------------------------------------------------------------------
    // USERS — geographic distribution (leverages existing collections)
    // ------------------------------------------------------------------
    if (section === 'all' || section === 'users') {
      const [activeUsers, countryStats, totalPings] = await Promise.all([
        db.collection('user_locations')
          .find({ lastSeen: { $gte: since } })
          .project({
            userId: 1,
            userName: 1,
            lastLocation: 1,
            lastSeen: 1,
            platform: 1,
            appVersion: 1,
            pingCount: 1,
          })
          .toArray(),

        db.collection('user_locations').aggregate([
          { $match: { lastSeen: { $gte: since } } },
          {
            $group: {
              _id: '$lastLocation.countryCode',
              country: { $first: '$lastLocation.country' },
              count: { $sum: 1 },
              users: {
                $push: {
                  name: '$userName',
                  city: '$lastLocation.city',
                  platform: '$platform',
                },
              },
            },
          },
          { $sort: { count: -1 } },
        ]).toArray(),

        db.collection('analytics_pings').countDocuments({
          timestamp: { $gte: since },
        }),
      ]);

      result.users = { activeUsers, countryStats, totalPings };
    }

    // ------------------------------------------------------------------
    // FEATURES — screen views and feature usage
    // ------------------------------------------------------------------
    if (section === 'all' || section === 'features') {
      const [screenViews, featureUsage, topFeaturesByUser] = await Promise.all([
        // Screen view counts
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'screen_view',
            },
          },
          {
            $group: {
              _id: '$properties.screen',
              views: { $sum: 1 },
              uniqueUsers: { $addToSet: '$userId' },
            },
          },
          {
            $project: {
              screen: '$_id',
              views: 1,
              uniqueUsers: { $size: '$uniqueUsers' },
              _id: 0,
            },
          },
          { $sort: { views: -1 } },
        ]).toArray(),

        // Feature interaction counts
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'feature_use',
            },
          },
          {
            $group: {
              _id: '$event',
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$userId' },
            },
          },
          {
            $project: {
              feature: '$_id',
              count: 1,
              uniqueUsers: { $size: '$uniqueUsers' },
              _id: 0,
            },
          },
          { $sort: { count: -1 } },
        ]).toArray(),

        // Top features per user (for engagement analysis)
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'feature_use',
              userId: { $ne: null },
            },
          },
          {
            $group: {
              _id: { user: '$userName', feature: '$event' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 50 },
          {
            $project: {
              userName: '$_id.user',
              feature: '$_id.feature',
              count: 1,
              _id: 0,
            },
          },
        ]).toArray(),
      ]);

      result.features = { screenViews, featureUsage, topFeaturesByUser };
    }

    // ------------------------------------------------------------------
    // HEALTH — API success rates, latency, errors
    // ------------------------------------------------------------------
    if (section === 'all' || section === 'health') {
      const [
        apiOverview,
        endpointStats,
        errorBreakdown,
        latencyTimeline,
        syncEvents,
      ] = await Promise.all([
        // Overall API call stats
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'api_call',
            },
          },
          {
            $group: {
              _id: null,
              totalCalls: { $sum: 1 },
              successCount: {
                $sum: { $cond: [{ $eq: ['$properties.success', true] }, 1, 0] },
              },
              failCount: {
                $sum: { $cond: [{ $eq: ['$properties.success', false] }, 1, 0] },
              },
              avgLatency: { $avg: '$properties.durationMs' },
              p95Latency: { $percentile: { input: '$properties.durationMs', p: [0.95], method: 'approximate' } },
            },
          },
          { $project: { _id: 0 } },
        ]).toArray(),

        // Per-endpoint breakdown
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'api_call',
            },
          },
          {
            $group: {
              _id: { method: '$properties.method', endpoint: '$properties.endpoint' },
              calls: { $sum: 1 },
              failures: {
                $sum: { $cond: [{ $eq: ['$properties.success', false] }, 1, 0] },
              },
              avgLatency: { $avg: '$properties.durationMs' },
            },
          },
          {
            $project: {
              method: '$_id.method',
              endpoint: '$_id.endpoint',
              calls: 1,
              failures: 1,
              successRate: {
                $cond: [
                  { $gt: ['$calls', 0] },
                  { $multiply: [{ $divide: [{ $subtract: ['$calls', '$failures'] }, '$calls'] }, 100] },
                  0,
                ],
              },
              avgLatency: { $round: ['$avgLatency', 0] },
              _id: 0,
            },
          },
          { $sort: { calls: -1 } },
        ]).toArray(),

        // Error breakdown
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: { $in: ['api_call', 'error'] },
              'properties.success': false,
            },
          },
          {
            $group: {
              _id: {
                endpoint: '$properties.endpoint',
                status: '$properties.status',
              },
              count: { $sum: 1 },
              lastSeen: { $max: '$eventTimestamp' },
              sampleError: { $first: '$properties.error' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 20 },
          {
            $project: {
              endpoint: '$_id.endpoint',
              status: '$_id.status',
              count: 1,
              lastSeen: 1,
              sampleError: 1,
              _id: 0,
            },
          },
        ]).toArray(),

        // Latency over time (hourly averages)
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'api_call',
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$eventTimestamp' },
              },
              avgLatency: { $avg: '$properties.durationMs' },
              calls: { $sum: 1 },
              failures: {
                $sum: { $cond: [{ $eq: ['$properties.success', false] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              hour: '$_id',
              avgLatency: { $round: ['$avgLatency', 0] },
              calls: 1,
              failures: 1,
              _id: 0,
            },
          },
        ]).toArray(),

        // Session lifecycle events (connects, disconnects, queue activity)
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'session',
            },
          },
          {
            $group: {
              _id: '$event',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              event: '$_id',
              count: 1,
              _id: 0,
            },
          },
          { $sort: { count: -1 } },
        ]).toArray(),
      ]);

      result.health = {
        apiOverview: apiOverview[0] || {
          totalCalls: 0,
          successCount: 0,
          failCount: 0,
          avgLatency: 0,
          p95Latency: [0],
        },
        endpointStats,
        errorBreakdown,
        latencyTimeline,
        syncEvents,
      };
    }

    // ------------------------------------------------------------------
    // API USAGE — Public API (v1) metrics
    // ------------------------------------------------------------------
    if (section === 'all' || section === 'apiUsage') {
      const [
        apiOverviewV1,
        endpointBreakdown,
        keyUsage,
        apiTimeline,
        apiErrorBreakdown,
      ] = await Promise.all([
        // Overall v1 API stats
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'v1_api',
            },
          },
          {
            $group: {
              _id: null,
              totalCalls: { $sum: 1 },
              successCount: {
                $sum: { $cond: [{ $eq: ['$properties.success', true] }, 1, 0] },
              },
              failCount: {
                $sum: { $cond: [{ $eq: ['$properties.success', false] }, 1, 0] },
              },
              avgLatency: { $avg: '$properties.durationMs' },
              uniqueKeys: { $addToSet: '$properties.apiKeyPrefix' },
            },
          },
          {
            $project: {
              _id: 0,
              totalCalls: 1,
              successCount: 1,
              failCount: 1,
              avgLatency: { $round: ['$avgLatency', 0] },
              uniqueKeys: { $size: '$uniqueKeys' },
            },
          },
        ]).toArray(),

        // Per-endpoint breakdown for v1
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'v1_api',
            },
          },
          {
            $group: {
              _id: { method: '$properties.method', endpoint: '$properties.endpoint' },
              calls: { $sum: 1 },
              failures: {
                $sum: { $cond: [{ $eq: ['$properties.success', false] }, 1, 0] },
              },
              avgLatency: { $avg: '$properties.durationMs' },
            },
          },
          {
            $project: {
              method: '$_id.method',
              endpoint: '$_id.endpoint',
              calls: 1,
              failures: 1,
              successRate: {
                $cond: [
                  { $gt: ['$calls', 0] },
                  { $multiply: [{ $divide: [{ $subtract: ['$calls', '$failures'] }, '$calls'] }, 100] },
                  0,
                ],
              },
              avgLatency: { $round: ['$avgLatency', 0] },
              _id: 0,
            },
          },
          { $sort: { calls: -1 } },
        ]).toArray(),

        // Usage by API key
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'v1_api',
              'properties.apiKeyPrefix': { $ne: null },
            },
          },
          {
            $group: {
              _id: '$properties.apiKeyPrefix',
              totalCalls: { $sum: 1 },
              successCount: {
                $sum: { $cond: [{ $eq: ['$properties.success', true] }, 1, 0] },
              },
              failCount: {
                $sum: { $cond: [{ $eq: ['$properties.success', false] }, 1, 0] },
              },
              avgLatency: { $avg: '$properties.durationMs' },
              lastUsed: { $max: '$eventTimestamp' },
            },
          },
          {
            $project: {
              keyPrefix: '$_id',
              totalCalls: 1,
              successCount: 1,
              failCount: 1,
              avgLatency: { $round: ['$avgLatency', 0] },
              lastUsed: 1,
              _id: 0,
            },
          },
          { $sort: { totalCalls: -1 } },
        ]).toArray(),

        // Activity timeline (hourly)
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'v1_api',
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$eventTimestamp' },
              },
              calls: { $sum: 1 },
              failures: {
                $sum: { $cond: [{ $eq: ['$properties.success', false] }, 1, 0] },
              },
              avgLatency: { $avg: '$properties.durationMs' },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              hour: '$_id',
              calls: 1,
              failures: 1,
              avgLatency: { $round: ['$avgLatency', 0] },
              _id: 0,
            },
          },
        ]).toArray(),

        // Error breakdown for v1
        telemetry.aggregate([
          {
            $match: {
              eventTimestamp: { $gte: since },
              category: 'v1_api',
              'properties.success': false,
            },
          },
          {
            $group: {
              _id: {
                endpoint: '$properties.endpoint',
                status: '$properties.status',
              },
              count: { $sum: 1 },
              lastSeen: { $max: '$eventTimestamp' },
              sampleError: { $first: '$properties.error' },
              keyPrefix: { $first: '$properties.apiKeyPrefix' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 20 },
          {
            $project: {
              endpoint: '$_id.endpoint',
              status: '$_id.status',
              count: 1,
              lastSeen: 1,
              sampleError: 1,
              keyPrefix: 1,
              _id: 0,
            },
          },
        ]).toArray(),
      ]);

      result.apiUsage = {
        overview: apiOverviewV1[0] || {
          totalCalls: 0,
          successCount: 0,
          failCount: 0,
          avgLatency: 0,
          uniqueKeys: 0,
        },
        endpointBreakdown,
        keyUsage,
        apiTimeline,
        apiErrorBreakdown,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Analytics] Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate monitoring data' },
      { status: 500 },
    );
  }
}
