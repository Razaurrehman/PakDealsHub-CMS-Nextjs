export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { paginate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const search = searchParams.get('search') ?? '';
    const isApproved = searchParams.get('isApproved');
    const rating = searchParams.get('rating');
    const productId = searchParams.get('productId');

    const where: any = {
      siteId,
      ...(search ? { OR: [{ reviewer: { contains: search, mode: 'insensitive' } }, { comment: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(isApproved !== null ? { isApproved: isApproved === 'true' } : {}),
      ...(rating ? { rating: parseInt(rating) } : {}),
      ...(productId ? { productId } : {}),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where, ...paginate(page),
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, thumbnail: true } } },
      }),
      prisma.review.count({ where }),
    ]);
    return ok({ reviews, total, page });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const { ids } = await req.json() as { ids: string[] };
    if (!ids?.length) return badRequest('No IDs provided');
    const result = await prisma.review.deleteMany({ where: { siteId, id: { in: ids } } });
    await logActivity({ userId, action: 'BULK_DELETE', entity: 'Review', siteId, metadata: { ids, deleted: result.count }, ...getClientInfo(req) });
    return ok({ deleted: result.count });
  } catch { return serverError(); }
}
