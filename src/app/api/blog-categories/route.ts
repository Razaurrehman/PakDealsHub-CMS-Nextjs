export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { blogCategorySchema } from '@/lib/validations';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { slugify, paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const pageParam = searchParams.get('page');

    const where = {
      siteId,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    if (pageParam !== null) {
      const page = Math.max(1, Number(pageParam));
      const [blogCategories, total] = await Promise.all([
        prisma.blogCategory.findMany({ where, ...paginate(page), orderBy: { name: 'asc' } }),
        prisma.blogCategory.count({ where }),
      ]);
      return ok({ blogCategories, total, page });
    }

    const blogCategories = await prisma.blogCategory.findMany({ where, orderBy: { name: 'asc' } });
    return ok(blogCategories);
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = blogCategorySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const blogCategory = await prisma.blogCategory.create({ data: { ...parsed.data, slug, siteId } });
    await logActivity({ userId, action: 'CREATE', entity: 'BlogCategory', entityId: blogCategory.id, siteId, ...getClientInfo(req) });
    return created(blogCategory);
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Slug already exists');
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const { ids } = await req.json() as { ids: string[] };
    if (!ids?.length) return badRequest('No IDs provided');
    const result = await prisma.blogCategory.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'BlogCategory', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
