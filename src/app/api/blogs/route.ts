export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { blogSchema } from '@/lib/validations';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { slugify, calcReadingTime, paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? 1);
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status');
    const blogCategoryId = searchParams.get('blogCategoryId');
    const tagId = searchParams.get('tagId');

    const where: any = {
      siteId,
      ...(status ? { status } : {}),
      ...(blogCategoryId ? { blogCategoryId } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where, ...paginate(page),
        orderBy: { createdAt: 'desc' },
        include: {
          blogCategory: { select: { id: true, name: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      }),
      prisma.blog.count({ where }),
    ]);
    return ok({ blogs, total, page });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const { ids } = await req.json() as { ids: string[] };
    if (!ids?.length) return badRequest('No IDs provided');
    const result = await prisma.blog.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'Blog', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = blogSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const { tagIds, publishedAt, scheduledAt, ...rest } = parsed.data;
    const slug = rest.slug || slugify(rest.title);
    const readingTime = rest.content ? calcReadingTime(rest.content) : 1;

    const blog = await prisma.blog.create({
      data: {
        ...rest, slug, readingTime, siteId,
        publishedAt: publishedAt ? new Date(publishedAt) : (rest.status === 'PUBLISHED' ? new Date() : null),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        tags: tagIds?.length ? { create: tagIds.map((tagId: string) => ({ tagId })) } : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
    await logActivity({ userId, action: 'CREATE', entity: 'Blog', entityId: blog.id, siteId, ...getClientInfo(req) });
    return created(blog);
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Slug already exists');
    return serverError();
  }
}
