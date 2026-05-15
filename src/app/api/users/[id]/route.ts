export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { userSchema } from '@/lib/validations';
import { ok, noContent, badRequest, forbidden, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const role = req.headers.get('x-user-role') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const updateData: any = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    };
    if (parsed.data.password) {
      updateData.passwordHash = bcrypt.hashSync(parsed.data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    await logActivity({ userId, action: 'UPDATE_USER', entity: 'User', entityId: id, siteId, ...getClientInfo(req) });
    return ok(user);
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const role = req.headers.get('x-user-role') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return forbidden();

    await prisma.user.delete({ where: { id } });
    await logActivity({ userId, action: 'DELETE_USER', entity: 'User', entityId: id, siteId, ...getClientInfo(req) });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
