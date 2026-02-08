import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/mongodb';
import { sendMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

// POST /api/auth/magic-link — request a magic link email
export async function POST(request: NextRequest) {
  try {
    const { email, redirectUrl, source } = await request.json();
    const isMobile = source === 'mobile';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // TESTER BYPASS: Allow demo account without sending email
    const TESTER_EMAIL = 'demo@devrelinsights.app';
    if (normalizedEmail === TESTER_EMAIL) {
      // Return success - user will enter code 999999 which is handled in verify-code
      return NextResponse.json({ sent: true });
    }
    
    // Only allow @mongodb.com emails
    const domain = normalizedEmail.split('@')[1];
    if (domain !== 'mongodb.com') {
      return NextResponse.json(
        { error: 'Only @mongodb.com emails are allowed' },
        { status: 403 }
      );
    }

    const db = await getDb();

    // Check advocates first (primary users), then users collection
    const advocate = await db.collection('advocates').findOne({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    const user = !advocate
      ? await db.collection('users').findOne({ email: normalizedEmail })
      : null;

    // Always return success (don't reveal if email exists)
    if (!advocate && !user) {
      console.log('[Auth] Email not found:', normalizedEmail);
      return NextResponse.json({ sent: true });
    }

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Determine role - use advocate's actual role, not just 'advocate'
    const userRole = advocate?.role || user?.role || 'viewer';
    const isAdmin = userRole === 'admin' || advocate?.isAdmin === true || user?.isAdmin === true;

    // Store code for verification
    await db.collection('auth_codes').insertOne({
      code,
      email: normalizedEmail,
      advocateId: advocate?._id || null,
      userName: advocate?.name || user?.name || normalizedEmail.split('@')[0],
      userRole,
      isAdmin,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    } as any);

    // Create TTL index if it doesn't exist
    await db.collection('auth_codes').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    ).catch(() => {});

    // Also generate a magic link token for web (backwards compatibility)
    const token = crypto.randomBytes(32).toString('hex');
    await db.collection('magic_links').insertOne({
      token,
      email: normalizedEmail,
      advocateId: advocate?._id || null,
      userName: advocate?.name || user?.name || normalizedEmail.split('@')[0],
      userRole,
      isAdmin,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    } as any);

    await db.collection('magic_links').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    ).catch(() => {});

    // Build the magic link URL (for web)
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;
    const magicUrl = `${baseUrl}/api/auth/magic-link/${token}`;
    
    const firstName = (advocate?.name || user?.name || '').split(' ')[0] || 'there';
    const appName = isMobile ? 'DevRel Insights Mobile' : 'DevRel Insights Admin';

    // Format code with spaces for readability
    const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;

    // Send the email with verification code
    await sendMail({
      to: normalizedEmail,
      subject: `${code} is your ${appName} verification code`,
      html: `
        <p>Hi ${firstName},</p>
        <p>Your verification code for ${appName} is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#001E2B;margin:24px 0;">${formattedCode}</p>
        <p>Enter this code in the app to sign in. It expires in 15 minutes.</p>
        ${!isMobile ? `
        <p style="margin-top:24px;padding-top:24px;border-top:1px solid #E3E4E5;">
          Or click to sign in directly:
        </p>
        <p><a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#00ED64;color:#001E2B;text-decoration:none;border-radius:8px;font-weight:600;">Sign In</a></p>
        ` : ''}
        <p style="margin-top:24px;color:#889397;">— DevRel Insights</p>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
