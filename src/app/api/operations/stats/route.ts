import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = await getDb();

    // Get collection stats
    const collections = await db.listCollections().toArray();
    const collectionStats = await Promise.all(
      collections.map(async (col) => {
        const stats = await db
          .collection(col.name)
          .aggregate([
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                lastModified: { $max: { $ifNull: ['$updatedAt', '$createdAt'] } },
              },
            },
          ])
          .toArray();

        const indexes = await db.collection(col.name).indexes();

        // Estimate size (approximate)
        const count = stats[0]?.count || 0;
        const avgDocSize = 500; // Rough estimate

        return {
          name: col.name,
          count,
          size: count * avgDocSize,
          indexes: indexes.length,
          lastModified: stats[0]?.lastModified || null,
        };
      })
    );

    const totalDocuments = collectionStats.reduce((sum, c) => sum + c.count, 0);
    const totalSize = collectionStats.reduce((sum, c) => sum + c.size, 0);

    return NextResponse.json({
      database: db.databaseName,
      collections: collectionStats.sort((a, b) => b.count - a.count),
      totalDocuments,
      totalSize,
    });
  } catch (error) {
    console.error('GET /api/operations/stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
