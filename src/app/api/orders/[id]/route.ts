export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { orderUpdateSchema } from '@/lib/validations';
import { ok, badRequest, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true, thumbnail: true } } } },
        coupon: true,
      },
    });
    if (!order) return notFound();
    return ok(order);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const order = await prisma.order.update({ where: { id }, data: parsed.data });
    await logActivity({ userId, action: 'UPDATE', entity: 'Order', entityId: id, siteId, ...getClientInfo(req) });
    return ok(order);
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
