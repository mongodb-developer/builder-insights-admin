/**
 * Builder Insights - API Key Management
 *
 * Provides generation, validation, and rate-limiting for public API keys.
 * Keys are stored hashed (SHA-256) in the `api_keys` collection.
 * Usage counters are tracked in the `api_usage` collection with daily granularity.
 */

import { randomBytes, createHash } from 'crypto';
import { getDb, getCollection, collections } from './mongodb';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiKey {
  _id?: string;
  /** First 8 chars of the key, for display/identification */
  prefix: string;
  /** SHA-256 hash of the full key */
  keyHash: string;
  /** Human-readable name for this key */
  name: string;
  /** Description of intended use */
  description?: string;
  /** Email of the person/org this key was issued to */
  ownerEmail: string;
  /** Owner display name */
  ownerName: string;
  /** Which API scopes this key grants */
  scopes: ApiScope[];
  /** Max requests per day (0 = unlimited) */
  rateLimit: number;
  /** Whether the key is currently active */
  isActive: boolean;
  /** When the key expires (null = never) */
  expiresAt: string | null;
  /** Admin who created the key */
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** When the key was last used */
  lastUsedAt: string | null;
  /** Total lifetime requests */
  totalRequests: number;
  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
}

export type ApiScope =
  | 'insights:read'
  | 'insights:write'
  | 'events:read'
  | 'events:write'
  | 'sessions:read'
  | 'advocates:read';

export const ALL_SCOPES: ApiScope[] = [
  'insights:read',
  'insights:write',
  'events:read',
  'events:write',
  'sessions:read',
  'advocates:read',
];

export const SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  'insights:read': 'Read insights data',
  'insights:write': 'Create and update insights',
  'events:read': 'Read events data',
  'events:write': 'Create and update events',
  'sessions:read': 'Read session data',
  'advocates:read': 'Read advocate profiles',
};

export interface ApiKeyValidation {
  valid: boolean;
  key?: ApiKey;
  error?: string;
}

// ============================================================================
// KEY GENERATION
// ============================================================================

const KEY_PREFIX = 'bi_';
const KEY_BYTES = 32; // 256-bit key

/**
 * Generate a new API key. Returns the plaintext key (shown once) and the
 * database document (with hashed key).
 */
export async function generateApiKey(params: {
  name: string;
  description?: string;
  ownerEmail: string;
  ownerName: string;
  scopes: ApiScope[];
  rateLimit?: number;
  expiresAt?: string | null;
  createdBy: string;
}): Promise<{ plaintextKey: string; apiKey: ApiKey }> {
  const rawKey = randomBytes(KEY_BYTES).toString('hex');
  const plaintextKey = `${KEY_PREFIX}${rawKey}`;
  const prefix = plaintextKey.slice(0, 11); // "bi_" + first 8 hex chars
  const keyHash = hashKey(plaintextKey);

  const now = new Date().toISOString();
  const apiKey: ApiKey = {
    prefix,
    keyHash,
    name: params.name,
    description: params.description || '',
    ownerEmail: params.ownerEmail.toLowerCase(),
    ownerName: params.ownerName,
    scopes: params.scopes,
    rateLimit: params.rateLimit ?? 1000, // Default: 1000 requests/day
    isActive: true,
    expiresAt: params.expiresAt ?? null,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    totalRequests: 0,
  };

  const col = await getCollection(collections.apiKeys);
  const result = await col.insertOne(apiKey as any);
  apiKey._id = result.insertedId.toString();

  // Ensure indexes
  await ensureApiKeyIndexes();

  return { plaintextKey, apiKey };
}

// ============================================================================
// KEY VALIDATION
// ============================================================================

/**
 * Validate an API key and check rate limits.
 * Returns the key document if valid, or an error message.
 */
export async function validateApiKey(plaintextKey: string): Promise<ApiKeyValidation> {
  if (!plaintextKey || !plaintextKey.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const keyHash = hashKey(plaintextKey);
  const col = await getCollection(collections.apiKeys);
  const key = await col.findOne({ keyHash }) as unknown as ApiKey | null;

  if (!key) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!key.isActive) {
    return { valid: false, error: 'API key has been revoked' };
  }

  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Check rate limit
  if (key.rateLimit > 0) {
    const todayUsage = await getDailyUsage(keyHash);
    if (todayUsage >= key.rateLimit) {
      return { valid: false, error: `Rate limit exceeded (${key.rateLimit} requests/day)` };
    }
  }

  return { valid: true, key };
}

/**
 * Record a successful API request for rate limiting and analytics.
 */
export async function recordApiUsage(keyHash: string, endpoint: string, method: string): Promise<void> {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Increment daily counter
    await db.collection(collections.apiUsage).updateOne(
      { keyHash, date: today },
      {
        $inc: { requestCount: 1 },
        $setOnInsert: { keyHash, date: today, createdAt: new Date().toISOString() },
        $push: {
          requests: {
            $each: [{ endpoint, method, timestamp: new Date().toISOString() }],
            $slice: -100, // Keep last 100 request details per day
          },
        } as any,
      },
      { upsert: true }
    );

    // Update key's last-used timestamp and total count
    await db.collection(collections.apiKeys).updateOne(
      { keyHash },
      {
        $set: { lastUsedAt: new Date().toISOString() },
        $inc: { totalRequests: 1 },
      }
    );
  } catch (error) {
    console.error('[ApiKeys] Failed to record usage:', error);
  }
}

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * List all API keys (for admin dashboard). Never returns the hash.
 */
export async function listApiKeys(): Promise<Omit<ApiKey, 'keyHash'>[]> {
  const col = await getCollection(collections.apiKeys);
  const keys = await col
    .find({})
    .sort({ createdAt: -1 })
    .project({ keyHash: 0 })
    .toArray();
  return keys as unknown as Omit<ApiKey, 'keyHash'>[];
}

/**
 * Get a single API key by ID (for admin).
 */
export async function getApiKeyById(id: string): Promise<Omit<ApiKey, 'keyHash'> | null> {
  const { ObjectId } = await import('mongodb');
  const col = await getCollection(collections.apiKeys);
  const key = await col.findOne(
    { _id: new ObjectId(id) as any },
    { projection: { keyHash: 0 } }
  );
  return key as unknown as Omit<ApiKey, 'keyHash'> | null;
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(id: string, revokedBy: string): Promise<boolean> {
  const { ObjectId } = await import('mongodb');
  const col = await getCollection(collections.apiKeys);
  const result = await col.updateOne(
    { _id: new ObjectId(id) as any },
    {
      $set: {
        isActive: false,
        updatedAt: new Date().toISOString(),
        revokedBy,
        revokedAt: new Date().toISOString(),
      },
    }
  );
  return result.modifiedCount > 0;
}

/**
 * Update an API key's settings (name, scopes, rate limit, etc.).
 */
export async function updateApiKey(
  id: string,
  updates: Partial<Pick<ApiKey, 'name' | 'description' | 'scopes' | 'rateLimit' | 'expiresAt' | 'isActive' | 'metadata'>>
): Promise<boolean> {
  const { ObjectId } = await import('mongodb');
  const col = await getCollection(collections.apiKeys);
  const result = await col.updateOne(
    { _id: new ObjectId(id) as any },
    {
      $set: {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    }
  );
  return result.modifiedCount > 0;
}

/**
 * Get usage statistics for a specific key.
 */
export async function getApiKeyUsageStats(keyHash: string, days: number = 30) {
  const db = await getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const usage = await db
    .collection(collections.apiUsage)
    .find({ keyHash, date: { $gte: sinceStr } })
    .sort({ date: -1 })
    .toArray();

  const totalRequests = usage.reduce((sum, day) => sum + (day.requestCount || 0), 0);
  const dailyAverage = days > 0 ? Math.round(totalRequests / days) : 0;

  return {
    totalRequests,
    dailyAverage,
    dailyBreakdown: usage.map((d) => ({ date: d.date, count: d.requestCount })),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function hashKey(plaintextKey: string): string {
  return createHash('sha256').update(plaintextKey).digest('hex');
}

async function getDailyUsage(keyHash: string): Promise<number> {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const record = await db.collection(collections.apiUsage).findOne({ keyHash, date: today });
  return record?.requestCount || 0;
}

let _indexesCreated = false;
async function ensureApiKeyIndexes(): Promise<void> {
  if (_indexesCreated) return;
  try {
    const db = await getDb();
    await Promise.all([
      db.collection(collections.apiKeys).createIndex({ keyHash: 1 }, { unique: true }),
      db.collection(collections.apiKeys).createIndex({ ownerEmail: 1 }),
      db.collection(collections.apiKeys).createIndex({ isActive: 1 }),
      db.collection(collections.apiUsage).createIndex({ keyHash: 1, date: 1 }, { unique: true }),
      // Auto-delete usage records older than 90 days
      db.collection(collections.apiUsage).createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 90 * 24 * 60 * 60 }
      ),
    ]);
    _indexesCreated = true;
  } catch (error) {
    console.error('[ApiKeys] Failed to create indexes:', error);
  }
}
