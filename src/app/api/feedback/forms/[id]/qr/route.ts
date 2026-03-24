import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getCollection, collections } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasRole, ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/feedback/forms/[id]/qr - Generate QR code for a form
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!hasRole(session.role, ROLES.ADVOCATE)) {
      return NextResponse.json({ error: 'Advocate access required' }, { status: 403 });
    }

    const { id } = await context.params;

    const col = await getCollection(collections.feedbackForms);
    const form = await col.findOne({ _id: id as any });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check ownership or manager access
    const isOwner = form.advocateId === session.advocateId || form.advocateId === session.email;
    if (!isOwner && !hasRole(session.role, ROLES.MANAGER)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build the public form URL
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'png';

    // Determine the base URL from the request or env
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

    const formUrl = `${baseUrl}/f/${form.slug}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(formUrl, {
        type: 'svg',
        width: 300,
        margin: 2,
        color: {
          dark: '#001E2B',
          light: '#FFFFFF',
        },
      });

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Default: PNG
    const pngBuffer = await QRCode.toBuffer(formUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#001E2B',
        light: '#FFFFFF',
      },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="qr-${form.slug}.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('GET /api/feedback/forms/[id]/qr error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
