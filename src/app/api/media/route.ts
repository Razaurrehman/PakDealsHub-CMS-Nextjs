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

    const where: any = {
      siteId,
      ...(search ? { filename: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [media, total] = await Promise.all([
      prisma.media.findMany({ where, ...paginate(page, 24), orderBy: { createdAt: 'desc' } }),
      prisma.media.count({ where }),
    ]);
    return ok({ media, total, page });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { ids } = await req.json() as { ids: string[] };
    if (!ids?.length) return badRequest('No IDs provided');
    const result = await prisma.media.deleteMany({ where: { siteId, id: { in: ids } } });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
