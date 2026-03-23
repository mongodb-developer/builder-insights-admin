/**
 * Activity Logging - Tracks user logins and admin actions
 * 
 * Stores events in the `activity_log` collection for audit purposes.
 * Admins can view user activity from the User Management page.
 */

import { getDb } from '@/lib/mongodb';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'role_changed'
  | 'bulk_update';

export interface ActivityLogEntry {
  action: ActivityAction;
  email: string;                    // The user who performed the action
  advocateId?: string | null;       // The advocate ID of the actor
  targetEmail?: string;             // The user affected (for admin actions)
  targetAdvocateId?: string;        // The advocate ID affected
  source?: 'web' | 'mobile' | 'api';
  ip?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>; // Additional context (e.g., old role -> new role)
  timestamp: Date;
}

// ============================================================================
// LOG ACTIVITY
// ============================================================================

/**
 * Log a user activity event. Fire-and-forget — errors are caught and logged
 * but never propagated to avoid disrupting the primary flow.
 */
export async function logActivity(entry: Omit<ActivityLogEntry, 'timestamp'>): Promise<void> {
  try {
    const db = await getDb();
    await db.collection('activity_log').insertOne({
      ...entry,
      timestamp: new Date(),
    });
  } catch (error) {
    // Never let activity logging break the main flow
    console.error('[ActivityLog] Failed to log activity:', error);
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get activity log entries for a specific user (by email or advocateId).
 */
export async function getUserActivity(
  identifier: { email?: string; advocateId?: string },
  options: { limit?: number; skip?: number; actions?: ActivityAction[] } = {}
) {
  const db = await getDb();
  const { limit = 50, skip = 0, actions } = options;

  const filter: Record<string, unknown> = {};

  // Match entries where user is either the actor or the target
  if (identifier.email) {
    filter.$or = [
      { email: identifier.email },
      { targetEmail: identifier.email },
    ];
  } else if (identifier.advocateId) {
    filter.$or = [
      { advocateId: identifier.advocateId },
      { targetAdvocateId: identifier.advocateId },
    ];
  }

  if (actions && actions.length > 0) {
    filter.action = { $in: actions };
  }

  const [entries, total] = await Promise.all([
    db.collection('activity_log')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('activity_log').countDocuments(filter),
  ]);

  return { entries, total };
}

/**
 * Get login statistics for a user.
 */
export async function getUserLoginStats(identifier: { email?: string; advocateId?: string }) {
  const db = await getDb();

  const matchFilter: Record<string, unknown> = { action: 'login' };
  if (identifier.email) {
    matchFilter.email = identifier.email;
  } else if (identifier.advocateId) {
    matchFilter.advocateId = identifier.advocateId;
  }

  const [totalLogins, lastLogin, last30DaysLogins] = await Promise.all([
    db.collection('activity_log').countDocuments(matchFilter),
    db.collection('activity_log')
      .findOne(matchFilter, { sort: { timestamp: -1 } }),
    db.collection('activity_log').countDocuments({
      ...matchFilter,
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  return {
    totalLogins,
    lastLoginAt: lastLogin?.timestamp || null,
    lastLoginSource: lastLogin?.source || null,
    last30DaysLogins,
  };
}

// ============================================================================
// INDEX SETUP
// ============================================================================

/**
 * Ensure indexes exist for efficient querying.
 * Called lazily on first use.
 */
let indexesCreated = false;
export async function ensureActivityIndexes(): Promise<void> {
  if (indexesCreated) return;
  try {
    const db = await getDb();
    const col = db.collection('activity_log');
    await Promise.all([
      col.createIndex({ email: 1, timestamp: -1 }),
      col.createIndex({ targetEmail: 1, timestamp: -1 }),
      col.createIndex({ advocateId: 1, timestamp: -1 }),
      col.createIndex({ action: 1, timestamp: -1 }),
      // TTL index: auto-delete entries older than 1 year
      col.createIndex({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }),
    ]);
    indexesCreated = true;
  } catch (error) {
    console.error('[ActivityLog] Failed to create indexes:', error);
  }
}
