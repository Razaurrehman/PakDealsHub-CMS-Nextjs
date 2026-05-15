export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { userSchema } from '@/lib/validations';
import { ok, created, badRequest, forbidden, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId   = req.headers.get('x-site-id') ?? '';
    const userRole = req.headers.get('x-user-role') ?? '';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) return forbidden();

    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get('page') ?? 1));
    const search   = searchParams.get('search') ?? '';
    const roleFilter = searchParams.get('role') ?? '';
    const active   = searchParams.get('isActive');

    const where: any = {
      siteId,
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(active !== null ? { isActive: active === 'true' } : {}),
      ...(search ? {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const select = { id: true, name: true, email: true, role: true, isActive: true, avatar: true, createdAt: true };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select, ...paginate(page), orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
    return ok({ users, total, page });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const role = req.headers.get('x-user-role') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);
    if (!parsed.data.password) return badRequest('Password is required');

    const hash = bcrypt.hashSync(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, passwordHash: hash, role: parsed.data.role as any, siteId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    await logActivity({ userId, action: 'CREATE_USER', entity: 'User', entityId: user.id, siteId, ...getClientInfo(req) });
    return created(user);
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Email already exists');
    return serverError();
  }
}
