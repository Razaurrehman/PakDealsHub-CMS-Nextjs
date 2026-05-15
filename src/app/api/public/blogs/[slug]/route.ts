export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SITE_DOMAIN = 'pakdealshub.com';

async function getSiteId() {
  const site = await prisma.site.findUnique({ where: { domain: SITE_DOMAIN }, select: { id: true } });
  return site?.id ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const siteId   = await getSiteId();
    if (!siteId) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const blog = await prisma.blog.findFirst({
      where: { siteId, slug, status: 'PUBLISHED' },
      select: {
        id: true, title: true, slug: true, content: true, excerpt: true,
        thumbnail: true, featuredImage: true,
        authorName: true, readingTime: true,
        isFeatured: true, publishedAt: true, createdAt: true,
        metaTitle: true, metaDesc: true,
        blogCategory: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });

    if (!blog) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ ok: true, data: blog });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
