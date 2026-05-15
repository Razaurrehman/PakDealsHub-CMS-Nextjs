export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getSiteId(): Promise<string | null> {
  const site = await prisma.site.findUnique({ where: { domain: 'pakdealshub.com' }, select: { id: true } });
  return site?.id ?? null;
}

export async function GET(req: Request) {
  try {
    const siteId = await getSiteId();
    if (!siteId) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const featured = searchParams.get('featured');

    const brands = await prisma.brand.findMany({
      where: {
        siteId,
        isActive: true,
        ...(featured === 'true' ? { isFeatured: true } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, logo: true, isActive: true, isFeatured: true },
    });

    return NextResponse.json({ ok: true, data: brands });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
