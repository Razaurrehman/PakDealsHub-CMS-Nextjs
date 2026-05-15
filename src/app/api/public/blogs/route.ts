export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SITE_DOMAIN = 'pakdealshub.com';

async function getSiteId() {
  const site = await prisma.site.findUnique({ where: { domain: SITE_DOMAIN }, select: { id: true } });
  return site?.id ?? null;
}

export async function GET(req: Request) {
  try {
    const siteId = await getSiteId();
    if (!siteId) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const page           = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit          = Math.min(50, Number(searchParams.get('limit') ?? 10));
    const search         = searchParams.get('search') ?? '';
    const blogCategoryId = searchParams.get('categoryId') ?? '';
    const featured       = searchParams.get('featured');

    const where: any = {
      siteId,
      status: 'PUBLISHED',
      ...(blogCategoryId ? { blogCategoryId } : {}),
      ...(featured === 'true' ? { isFeatured: true } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, slug: true, excerpt: true,
          thumbnail: true, featuredImage: true,
          authorName: true, readingTime: true,
          isFeatured: true, publishedAt: true, createdAt: true,
          blogCategory: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.blog.count({ where }),
    ]);

    return NextResponse.json({ ok: true, data: { items: blogs, total, page, limit } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
