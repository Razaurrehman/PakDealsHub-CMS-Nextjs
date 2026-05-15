export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getSiteId(): Promise<string | null> {
  const site = await prisma.site.findUnique({ where: { domain: 'pakdealshub.com' }, select: { id: true } });
  return site?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const siteId = await getSiteId();
    if (!siteId) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    const reviews = await prisma.review.findMany({
      where: {
        siteId,
        isApproved: true,
        ...(productId ? { productId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ ok: true, data: reviews });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
