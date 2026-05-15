export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SITE_DOMAIN = 'pakdealshub.com';

export async function GET() {
  try {
    const site = await prisma.site.findUnique({ where: { domain: SITE_DOMAIN }, select: { id: true } });
    if (!site) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const categories = await prisma.blogCategory.findMany({
      where: { siteId: site.id, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, description: true, image: true },
    });

    return NextResponse.json({ ok: true, data: categories });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
