import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/auth/magic-link/:token — validate magic link and create session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const isMobile = searchParams.get('source') === 'mobile';
    const db = await getDb();

    // Find and consume the token in one atomic operation
    const magicLink = await db.collection('magic_links').findOneAndUpdate(
      {
        token,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { returnDocument: 'before' }
    );

    if (!magicLink) {
      if (isMobile) {
        return NextResponse.json(
          { error: 'Link expired or already used. Request a new one.' },
          { status: 400 }
        );
      }
      const base = new URL(request.url).origin;
      const url = new URL('/login', base);
      url.searchParams.set('error', 'Link expired or already used. Request a new one.');
      return NextResponse.redirect(url);
    }

    // Create JWT session
    const jwt = await createToken({
      email: magicLink.email,
      name: magicLink.userName,
      role: magicLink.userRole,
      isAdmin: magicLink.isAdmin === true,
      advocateId: magicLink.advocateId,
    });

    // Update last access on advocate if applicable
    let advocate = null;
    if (magicLink.advocateId) {
      advocate = await db.collection('advocates').findOneAndUpdate(
        { _id: magicLink.advocateId },
        { $set: { lastAccessAt: new Date() } },
        { returnDocument: 'after' }
      );
    }

    // For mobile apps, return JSON with token
    if (isMobile) {
      return NextResponse.json({
        advocate: advocate || {
          _id: magicLink.advocateId,
          email: magicLink.email,
          name: magicLink.userName,
          role: magicLink.userRole,
        },
        token: jwt,
      });
    }

    // For web, set cookie and redirect to dashboard
    const url = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Magic link validation error:', error);
    
    const { searchParams } = new URL(request.url);
    if (searchParams.get('source') === 'mobile') {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }
    
    const base = new URL(request.url).origin;
    const url = new URL('/login', base);
    url.searchParams.set('error', 'Something went wrong. Please try again.');
    return NextResponse.redirect(url);
  }
}
