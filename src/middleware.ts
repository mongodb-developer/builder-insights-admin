import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'di-session';
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'devrel-insights-secret-change-me'
);

const PUBLIC_PATHS = [
  '/',              // Landing page
  '/login', 
  '/api/auth',      // All auth routes (magic-link, verify-code)
  '/api/events',    // Mobile app access
  '/api/insights',  // Mobile app access
  '/api/advocates', // Mobile app access
  '/api/attachments', // Photo uploads
  '/api/health',    // Health check endpoint
  '/api/slack',     // Slack integration
  '/api/sessions',  // Session management
  '/api/bugs',      // Bug reports from mobile app
  '/api/analytics', // Mobile app usage tracking (world map)
  '/api/stats',     // Mobile app team stats (executive dashboard)
];

// Paths that require admin role
const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
  '/operations',
  '/api/operations',
];

// Paths that require at least 'advocate' role for mutations (POST, PUT, PATCH, DELETE)
// Viewers can only GET these endpoints
const MUTATION_PROTECTED_PATHS = [
  '/api/insights',
  '/api/events',
  '/api/sessions',
];

// Paths that require at least 'manager' role
const MANAGER_PATHS = [
  '/import',
  '/api/events/upsert',
];

// Role hierarchy for comparison
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Allow static files (images, etc.)
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Redirect authenticated users from login to dashboard
  if (pathname === '/login' && token) {
    try {
      await jwtVerify(token, SECRET);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch {
      // Token invalid, continue to login
    }
  }

  // Allow public paths
  // Exact match for root, startsWith for other paths
  if (pathname === '/' || PUBLIC_PATHS.some((p) => p !== '/' && pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check session cookie (token already declared at top)
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const user = payload as unknown as TokenPayload;

    // Check admin paths
    const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
    if (isAdminPath) {
      if (user.role !== 'admin' && !user.isAdmin) {
        // Not admin - redirect to dashboard or return 403 for API
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }

    // Check manager paths
    const isManagerPath = MANAGER_PATHS.some((p) => pathname.startsWith(p));
    if (isManagerPath) {
      if (!hasRole(user.role, 'manager')) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Manager access required' },
            { status: 403 }
          );
        }
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }

    // Check mutation-protected paths (viewers can only GET)
    const method = request.method;
    const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isMutationProtectedPath = MUTATION_PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    
    if (isMutationMethod && isMutationProtectedPath) {
      if (!hasRole(user.role, 'advocate')) {
        return NextResponse.json(
          { error: 'You have view-only access. Contact an administrator to request edit permissions.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  } catch {
    // Invalid/expired token
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
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
