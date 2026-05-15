export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { categorySchema } from '@/lib/validations';
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
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where, ...paginate(page),
          include: { parent: { select: { id: true, name: true } } },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.category.count({ where }),
      ]);
      return ok({ categories, total, page });
    }

    const categories = await prisma.category.findMany({
      where,
      include: { parent: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return ok(categories);
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const category = await prisma.category.create({ data: { ...parsed.data, slug, siteId } });
    await logActivity({ userId, action: 'CREATE', entity: 'Category', entityId: category.id, siteId, ...getClientInfo(req) });
    return created(category);
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
    const result = await prisma.category.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'Category', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
