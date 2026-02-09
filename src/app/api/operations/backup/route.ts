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

    // Fetch all collections
    const [events, insights, advocates, bugs, users, sessions] = await Promise.all([
      db.collection('events').find({}).toArray(),
      db.collection('insights').find({}).toArray(),
      db.collection('advocates').find({}).toArray(),
      db.collection('bugs').find({}).toArray(),
      db
        .collection('users')
        .find({})
        .project({ password: 0 })
        .toArray(), // Exclude passwords
      db.collection('sessions').find({}).toArray(),
    ]);

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      createdBy: sessionUser.name || sessionUser.email,
      database: db.databaseName,
      data: {
        events,
        insights,
        advocates,
        bugs,
        users,
        sessions,
      },
      counts: {
        events: events.length,
        insights: insights.length,
        advocates: advocates.length,
        bugs: bugs.length,
        users: users.length,
        sessions: sessions.length,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('GET /api/operations/backup error:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
