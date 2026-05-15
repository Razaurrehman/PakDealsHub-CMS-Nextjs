export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bannerSchema } from '@/lib/validations';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const status = searchParams.get('status');

    const where: any = { siteId, ...(status ? { status } : {}) };

    const [banners, total] = await Promise.all([
      prisma.banner.findMany({ where, ...paginate(page), orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
      prisma.banner.count({ where }),
    ]);
    return ok({ banners, total, page });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const banner = await prisma.banner.create({ data: { ...parsed.data, siteId } });
    await logActivity({ userId, action: 'CREATE', entity: 'Banner', entityId: banner.id, siteId, ...getClientInfo(req) });
    return created(banner);
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const { ids } = await req.json() as { ids: string[] };
    if (!ids?.length) return badRequest('No IDs provided');
    const result = await prisma.banner.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'Banner', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
