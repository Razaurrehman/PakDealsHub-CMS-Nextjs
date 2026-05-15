export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { staticPageSchema } from '@/lib/validations';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const search = searchParams.get('search') ?? '';

    const where: any = {
      siteId,
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] } : {}),
    };

    const [pages, total] = await Promise.all([
      prisma.staticPage.findMany({ where, ...paginate(page), orderBy: { title: 'asc' } }),
      prisma.staticPage.count({ where }),
    ]);
    return ok({ pages, total, page });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = staticPageSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const page = await prisma.staticPage.create({ data: { ...parsed.data, siteId } });
    await logActivity({ userId, action: 'CREATE', entity: 'StaticPage', entityId: page.id, siteId, ...getClientInfo(req) });
    return created(page);
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
    const result = await prisma.staticPage.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'StaticPage', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
