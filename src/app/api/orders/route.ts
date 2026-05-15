export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, serverError } from '@/lib/api-response';
import { paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const paymentMethod = searchParams.get('paymentMethod');

    const where: any = {
      siteId,
      ...(search ? { OR: [{ customerName: { contains: search, mode: 'insensitive' } }, { orderNumber: { contains: search, mode: 'insensitive' } }, { customerPhone: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, ...paginate(page),
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: { select: { id: true, name: true, thumbnail: true } } } }, coupon: { select: { code: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    return ok({ orders, total, page });
  } catch { return serverError(); }
}
