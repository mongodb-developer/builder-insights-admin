import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Hostname for the public API subdomain. Requests to this host are restricted
// to the v1 API routes and the health endpoint — nothing else is served.
const API_SUBDOMAIN = 'api.builderinsights.app';

const COOKIE_NAME = 'di-session';

// JWT secret — lazy-initialized so the build process can complete without AUTH_SECRET set.
// In production, AUTH_SECRET must be provided or runtime requests will fail.
let _secret: Uint8Array | null = null;

function getAuthSecret(): Uint8Array {
  if (_secret) return _secret;
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET environment variable is required in production. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  _secret = new TextEncoder().encode(secret || 'builder-insights-secret-change-me');
  return _secret;
}

// CORS: In production, restrict to known origins. In development, allow all.
// The API subdomain always allows cross-origin requests because it uses API key
// auth (no cookies), so restricting by origin would just block legitimate callers.
function getAllowedOrigins(request: NextRequest): string[] | null {
  // API subdomain: always allow all origins — callers authenticate with API keys
  const host = request.headers.get('host') || '';
  if (host === API_SUBDOMAIN || host.startsWith(API_SUBDOMAIN + ':')) {
    return null; // null = allow all
  }

  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  }
  // No env var set — allow all in development, restrict in production
  if (process.env.NODE_ENV === 'production') {
    // In production with no ALLOWED_ORIGINS, default to same-origin only
    // (returning empty array means no cross-origin requests allowed)
    return [];
  }
  return null; // null = allow all (development)
}

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const allowedOrigins = getAllowedOrigins(request);
  const requestOrigin = request.headers.get('origin') || '';

  let allowOrigin = '*';
  if (allowedOrigins !== null) {
    // Restricted mode: only allow listed origins
    if (allowedOrigins.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else if (allowedOrigins.length === 0 && requestOrigin) {
      // No origins configured in production — deny cross-origin
      allowOrigin = '';
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin || 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    ...(allowedOrigins !== null && allowOrigin !== '*'
      ? { Vary: 'Origin' }
      : {}),
  };
}

// ============================================================================
// PATH CLASSIFICATION
// ============================================================================

// Fully public — no auth required for any HTTP method
const FULLY_PUBLIC_PATHS = [
  '/api/auth',   // Auth flow (magic-link, verify-code, logout)
  '/api/health', // Health check
  '/api/v1',     // Public API — uses its own API key auth (handled in route handlers)
];

// Public for GET only — reads allowed without auth (mobile app read access)
// POST/PUT/PATCH/DELETE on these paths require a valid JWT
const PUBLIC_GET_PATHS = [
  '/api/events',
  '/api/insights',
  '/api/advocates',
  '/api/sessions',
  '/api/bugs',
  '/api/attachments',
  '/api/analytics',
  '/api/stats',
  '/api/slack',
  '/api/cron',  // Cron routes handle their own auth via CRON_SECRET
];

// Feedback form public routes — handled specially below
// GET /api/feedback/[slug] and POST /api/feedback/[slug]/submit are public
// /api/feedback/forms/* requires advocate+ auth (handled by route handlers)

// Require admin role
const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
  '/operations',
  '/api/operations',
  '/monitoring',
];

// Require at least manager role
const MANAGER_PATHS = [
  '/import',
  '/api/events/upsert',
];

// Require at least advocate role to view these pages (viewers get redirected)
const ADVOCATE_PAGE_PATHS = [
  '/events/new',
];

// Require at least advocate role for mutations (viewers can only GET)
const ADVOCATE_MUTATION_PATHS = [
  '/api/insights',
  '/api/events',
  '/api/sessions',
  '/api/bugs',
  '/api/attachments',
  '/api/analytics',
  '/api/stats',
  '/api/feedback/forms',
];

// Require admin or manager role for mutations
const ADMIN_MUTATION_PATHS = [
  '/api/advocates',
  '/api/slack',
  '/api/program',
  '/api/schema',
];

// ============================================================================
// HELPERS
// ============================================================================

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  manager: 75,
  advocate: 50,
  viewer: 25,
};

function hasRole(userRole: string | undefined, requiredRole: string): boolean {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

interface TokenPayload {
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

function isMutationMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Extract JWT from cookie or Authorization header.
 * Supports both web (cookie) and mobile (Bearer token) auth.
 */
function extractToken(request: NextRequest): string | undefined {
  // 1. Try cookie first (web app)
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2. Fall back to Authorization header (mobile app)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return undefined;
}

async function verifyJwt(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- CORS preflight ---
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  const addCorsHeaders = (response: NextResponse) => {
    const headers = getCorsHeaders(request);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  };

  // --- API subdomain gate ---
  // When requests arrive on api.builderinsights.app, only serve the v1 API
  // and health endpoint. Everything else gets a 404 so the admin UI, internal
  // APIs, and authentication routes are never exposed on the public hostname.
  const host = request.headers.get('host') || '';
  if (host === API_SUBDOMAIN || host.startsWith(API_SUBDOMAIN + ':')) {
    if (pathname.startsWith('/api/v1') || pathname === '/api/health') {
      return addCorsHeaders(NextResponse.next());
    }
    return addCorsHeaders(
      NextResponse.json(
        { error: 'Not found', message: 'This endpoint is not available on the API subdomain. Use /api/v1/*.' },
        { status: 404 }
      )
    );
  }

  // --- Static files ---
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // --- Page routes (non-API) ---
  // Landing page and login are always accessible
  if (pathname === '/' || pathname === '/login') {
    const token = extractToken(request);
    // Redirect authenticated users from login to dashboard
    if (pathname === '/login' && token) {
      const user = await verifyJwt(token);
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // --- Public feedback form pages (no auth required) ---
  // /f/[slug] pages are public-facing forms for community developers
  if (pathname.startsWith('/f/')) {
    return NextResponse.next();
  }

  // --- Fully public API paths (any method, no auth) ---
  if (matchesPath(pathname, FULLY_PUBLIC_PATHS)) {
    if (pathname.startsWith('/api/')) {
      return addCorsHeaders(NextResponse.next());
    }
    return NextResponse.next();
  }

  // --- Public feedback form routes ---
  // /api/feedback/[slug] (GET) and /api/feedback/[slug]/submit (POST) are public
  // but /api/feedback/forms/* requires auth (falls through to normal auth checks)
  if (pathname.startsWith('/api/feedback/') && !pathname.startsWith('/api/feedback/forms')) {
    return addCorsHeaders(NextResponse.next());
  }

  // --- Public GET paths (read-only without auth) ---
  const isPublicGetPath = matchesPath(pathname, PUBLIC_GET_PATHS);
  if (isPublicGetPath && !isMutationMethod(request.method)) {
    // GET/HEAD/OPTIONS on these paths is allowed without auth
    if (pathname.startsWith('/api/')) {
      return addCorsHeaders(NextResponse.next());
    }
    return NextResponse.next();
  }

  // --- Everything below requires authentication ---
  const token = extractToken(request);

  if (!token) {
    // No token — redirect pages to login, return 401 for API
    if (pathname.startsWith('/api/')) {
      return addCorsHeaders(
        NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const user = await verifyJwt(token);
  if (!user) {
    // Invalid/expired token
    if (pathname.startsWith('/api/')) {
      return addCorsHeaders(
        NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      );
    }
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // --- Role-based access checks ---

  // Admin paths: require admin role
  if (matchesPath(pathname, ADMIN_PATHS)) {
    if (user.role !== 'admin' && !user.isAdmin) {
      if (pathname.startsWith('/api/')) {
        return addCorsHeaders(
          NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          )
        );
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Manager paths: require manager role or higher
  if (matchesPath(pathname, MANAGER_PATHS)) {
    if (!hasRole(user.role, 'manager')) {
      if (pathname.startsWith('/api/')) {
        return addCorsHeaders(
          NextResponse.json(
            { error: 'Manager access required' },
            { status: 403 }
          )
        );
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Advocate page paths: viewers can't access event creation/edit pages
  if (matchesPath(pathname, ADVOCATE_PAGE_PATHS) || /^\/events\/[^/]+\/edit$/.test(pathname)) {
    if (!hasRole(user.role, 'advocate')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Admin mutation paths: require manager or admin for write operations
  if (isMutationMethod(request.method) && matchesPath(pathname, ADMIN_MUTATION_PATHS)) {
    if (!hasRole(user.role, 'manager')) {
      return addCorsHeaders(
        NextResponse.json(
          { error: 'Manager or admin access required for this operation' },
          { status: 403 }
        )
      );
    }
  }

  // Advocate mutation paths: require advocate role or higher for write operations
  if (isMutationMethod(request.method) && matchesPath(pathname, ADVOCATE_MUTATION_PATHS)) {
    if (!hasRole(user.role, 'advocate')) {
      return addCorsHeaders(
        NextResponse.json(
          { error: 'You have view-only access. Contact an administrator to request edit permissions.' },
          { status: 403 }
        )
      );
    }
  }

  // Authenticated and authorized — proceed
  if (pathname.startsWith('/api/')) {
    return addCorsHeaders(NextResponse.next());
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (images, etc.)
     */
    '/((?!_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
};
