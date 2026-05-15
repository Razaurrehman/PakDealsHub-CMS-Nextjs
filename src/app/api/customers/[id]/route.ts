export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbidden, notFound, serverError } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId   = req.headers.get('x-site-id') ?? '';
    const userRole = req.headers.get('x-user-role') ?? '';
    if (!['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(userRole)) return forbidden();

    const customer = await prisma.customer.findFirst({
      where: { id, siteId },
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!customer) return notFound();
    return ok(customer);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId   = req.headers.get('x-site-id') ?? '';
    const userRole = req.headers.get('x-user-role') ?? '';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) return forbidden();

    const { name, phone, isActive } = await req.json();

    const result = await prisma.customer.updateMany({
      where: { id, siteId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    if (!result.count) return notFound();
    return ok({ updated: true });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId   = req.headers.get('x-site-id') ?? '';
    const userRole = req.headers.get('x-user-role') ?? '';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) return forbidden();

    const deleted = await prisma.customer.deleteMany({ where: { id, siteId } });
    if (!deleted.count) return notFound();
    return ok({ deleted: true });
  } catch { return serverError(); }
}
