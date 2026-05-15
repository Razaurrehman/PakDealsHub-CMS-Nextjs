export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/api-response';
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
      ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
      ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
    };

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({ where, ...paginate(page), orderBy: { subscribedAt: 'desc' } }),
      prisma.newsletterSubscriber.count({ where }),
    ]);
    return ok({ subscribers, total, page });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { ids } = await req.json() as { ids: string[] };
    if (!ids?.length) return badRequest('No IDs provided');
    const result = await prisma.newsletterSubscriber.deleteMany({ where: { siteId, id: { in: ids } } });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
