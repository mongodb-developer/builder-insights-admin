import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Normalize: if the legacy isAdmin flag is set, treat role as admin
    const effectiveIsAdmin = user.isAdmin || user.role === 'admin';
    const effectiveRole = effectiveIsAdmin ? 'admin' : user.role;

    return NextResponse.json({
      email: user.email,
      name: user.name,
      role: effectiveRole,
      isAdmin: effectiveIsAdmin,
      advocateId: user.advocateId || null,
    });
  } catch (error) {
    console.error('[GET /api/auth/me]', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
