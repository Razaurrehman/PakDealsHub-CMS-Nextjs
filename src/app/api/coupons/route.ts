export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { couponSchema } from '@/lib/validations';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const search = searchParams.get('search') ?? '';
    const isActive = searchParams.get('isActive');

    const where: any = {
      siteId,
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
    };

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({ where, ...paginate(page), orderBy: { createdAt: 'desc' } }),
      prisma.coupon.count({ where }),
    ]);
    return ok({ coupons, total, page });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const { expiresAt, ...rest } = parsed.data;
    const coupon = await prisma.coupon.create({
      data: { ...rest, expiresAt: expiresAt ? new Date(expiresAt) : null, siteId },
    });
    await logActivity({ userId, action: 'CREATE', entity: 'Coupon', entityId: coupon.id, siteId, ...getClientInfo(req) });
    return created(coupon);
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Coupon code already exists');
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const { ids } = await req.json() as { ids: string[] };
    if (!ids?.length) return badRequest('No IDs provided');
    const result = await prisma.coupon.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'Coupon', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
