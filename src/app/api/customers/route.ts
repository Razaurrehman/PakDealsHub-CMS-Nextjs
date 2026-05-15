export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbidden, serverError } from '@/lib/api-response';
import { paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId   = req.headers.get('x-site-id') ?? '';
    const userRole = req.headers.get('x-user-role') ?? '';
    if (!['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(userRole)) return forbidden();

    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get('page') ?? 1));
    const search   = searchParams.get('search') ?? '';
    const active   = searchParams.get('isActive');

    const where: any = {
      siteId,
      ...(active !== null && active !== '' ? { isActive: active === 'true' } : {}),
      ...(search ? {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const select = { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, select, ...paginate(page), orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);

    return ok({ customers, total, page });
  } catch { return serverError(); }
}
