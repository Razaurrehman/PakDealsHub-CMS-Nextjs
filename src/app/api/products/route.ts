export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productSchema } from '@/lib/validations';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { slugify, paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Number(searchParams.get('limit') ?? 20));
    const search = searchParams.get('search') ?? '';
    const categoryId = searchParams.get('categoryId');
    const brandId = searchParams.get('brandId');
    const status = searchParams.get('status');
    const featured = searchParams.get('isFeatured');

    const where: any = {
      siteId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(status ? { status } : {}),
      ...(featured === 'true' ? { isFeatured: true } : {}),
    };

    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return ok({ items, total, page, limit });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const product = await prisma.product.create({
      data: { ...parsed.data, slug, siteId },
    });
    await logActivity({ userId, action: 'CREATE', entity: 'Product', entityId: product.id, siteId, ...getClientInfo(req) });
    return created(product);
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
    const result = await prisma.product.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'Product', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
