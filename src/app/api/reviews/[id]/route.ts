export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, badRequest, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const review = await prisma.review.findUnique({ where: { id }, include: { product: true } });
    if (!review) return notFound();
    return ok(review);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();

    const review = await prisma.review.update({ where: { id }, data: body });
    await logActivity({ userId, action: 'UPDATE', entity: 'Review', entityId: id, siteId, ...getClientInfo(req) });
    return ok(review);
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
    await prisma.review.delete({ where: { id } });
    await logActivity({ userId, action: 'DELETE', entity: 'Review', entityId: id, siteId, ...getClientInfo(req) });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
