export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { blogSchema } from '@/lib/validations';
import { ok, noContent, badRequest, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { slugify, calcReadingTime } from '@/lib/utils';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const blog = await prisma.blog.findUnique({
      where: { id },
      include: {
        blogCategory: true,
        tags: { include: { tag: true } },
      },
    });
    if (!blog) return notFound();
    return ok(blog);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = blogSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const { tagIds, publishedAt, scheduledAt, ...rest } = parsed.data;
    const slug = rest.slug || slugify(rest.title);
    const readingTime = rest.content ? calcReadingTime(rest.content) : 1;

    await prisma.blogTag.deleteMany({ where: { blogId: id } });

    const blog = await prisma.blog.update({
      where: { id },
      data: {
        ...rest, slug, readingTime,
        publishedAt: publishedAt ? new Date(publishedAt) : (rest.status === 'PUBLISHED' ? new Date() : null),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        tags: tagIds?.length ? { create: tagIds.map((tagId: string) => ({ tagId })) } : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
    await logActivity({ userId, action: 'UPDATE', entity: 'Blog', entityId: id, siteId, ...getClientInfo(req) });
    return ok(blog);
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    await prisma.blog.delete({ where: { id } });
    await logActivity({ userId, action: 'DELETE', entity: 'Blog', entityId: id, siteId, ...getClientInfo(req) });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
