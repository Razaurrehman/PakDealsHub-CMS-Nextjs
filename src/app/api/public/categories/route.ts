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
    const limit    = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const featured = searchParams.get('featured');

    const categories = await prisma.category.findMany({
      where: {
        siteId,
        isActive: true,
        parentId: null,
        ...(featured === 'true' ? { isFeatured: true } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, emoji: true, image: true, isActive: true, isFeatured: true, sortOrder: true },
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json({ ok: true, data: categories });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
