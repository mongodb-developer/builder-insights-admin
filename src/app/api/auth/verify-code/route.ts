import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/verify-code — verify a 6-digit code
export async function POST(request: NextRequest) {
  try {
    const { email, code, source } = await request.json();
    const isMobile = source === 'mobile';

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.toString().trim();

    if (normalizedCode.length !== 6 || !/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // TESTER ACCOUNTS: For App Store reviewers, beta testers, and role testing
    // Each role has its own test account with code 999999
    const TESTER_ACCOUNTS: Record<string, { name: string; role: string; isAdmin: boolean }> = {
      'demo@devrelinsights.app': { name: 'Demo User', role: 'advocate', isAdmin: false },
      'admin@devrelinsights.app': { name: 'Admin Tester', role: 'admin', isAdmin: true },
      'manager@devrelinsights.app': { name: 'Manager Tester', role: 'manager', isAdmin: false },
      'advocate@devrelinsights.app': { name: 'Advocate Tester', role: 'advocate', isAdmin: false },
      'viewer@devrelinsights.app': { name: 'Viewer Tester', role: 'viewer', isAdmin: false },
    };
    const TESTER_CODE = '999999';
    
    const testerAccount = TESTER_ACCOUNTS[normalizedEmail];
    if (testerAccount && normalizedCode === TESTER_CODE) {
      const jwt = await createToken({
        email: normalizedEmail,
        name: testerAccount.name,
        role: testerAccount.role,
        isAdmin: testerAccount.isAdmin,
        advocateId: `tester_${testerAccount.role}`,
      });

      const testerAdvocate = {
        _id: `tester_${testerAccount.role}`,
        email: normalizedEmail,
        name: testerAccount.name,
        role: testerAccount.role,
      };

      if (isMobile) {
        return NextResponse.json({ advocate: testerAdvocate, token: jwt });
      }

      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      return response;
    }

    // DEV BYPASS: Code 123456 works for any @mongodb.com email
    if (normalizedCode === '123456' && normalizedEmail.endsWith('@mongodb.com')) {
      // Try to find existing advocate to get their actual role
      let advocate: any = await db.collection('advocates').findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      
      const userName = advocate?.name || normalizedEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      const userRole = advocate?.role || 'advocate';
      const isAdmin = userRole === 'admin' || advocate?.isAdmin === true;
      const advocateId = advocate?._id?.toString() || `dev_${normalizedEmail.replace(/[@.]/g, '_')}`;

      const jwt = await createToken({
        email: normalizedEmail,
        name: userName,
        role: userRole,
        isAdmin,
        advocateId,
      });

      if (!advocate) {
        advocate = {
          _id: advocateId,
          email: normalizedEmail,
          name: userName,
          role: userRole,
        };
      }

      if (isMobile) {
        return NextResponse.json({ advocate, token: jwt });
      }

      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      return response;
    }

    // Find and consume the code in one atomic operation
    const authCode = await db.collection('auth_codes').findOneAndUpdate(
      {
        email: normalizedEmail,
        code: normalizedCode,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { returnDocument: 'before' }
    );

    if (!authCode) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Create JWT session
    const jwt = await createToken({
      email: authCode.email,
      name: authCode.userName,
      role: authCode.userRole,
      isAdmin: authCode.isAdmin === true,
      advocateId: authCode.advocateId,
    });

    // Update last access on advocate if applicable
    let advocate = null;
    if (authCode.advocateId) {
      advocate = await db.collection('advocates').findOneAndUpdate(
        { _id: authCode.advocateId },
        { $set: { lastAccessAt: new Date() } },
        { returnDocument: 'after' }
      );
    }

    // For mobile apps, return JSON with token
    if (isMobile) {
      return NextResponse.json({
        advocate: advocate || {
          _id: authCode.advocateId,
          email: authCode.email,
          name: authCode.userName,
          role: authCode.userRole,
        },
        token: jwt,
      });
    }

    // For web, set cookie and return success
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Code verification error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
