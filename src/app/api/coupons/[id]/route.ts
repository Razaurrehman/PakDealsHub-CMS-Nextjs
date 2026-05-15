export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { couponSchema } from '@/lib/validations';
import { ok, noContent, badRequest, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return notFound();
    return ok(coupon);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const { expiresAt, ...rest } = parsed.data;
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { ...rest, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    await logActivity({ userId, action: 'UPDATE', entity: 'Coupon', entityId: id, siteId, ...getClientInfo(req) });
    return ok(coupon);
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
    await prisma.coupon.delete({ where: { id } });
    await logActivity({ userId, action: 'DELETE', entity: 'Coupon', entityId: id, siteId, ...getClientInfo(req) });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
