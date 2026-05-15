export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getSiteId(): Promise<string | null> {
  const site = await prisma.site.findUnique({ where: { domain: 'pakdealshub.com' }, select: { id: true } });
  return site?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const siteId = await getSiteId();
    if (!siteId) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
    const search = searchParams.get('search') ?? '';
    const categoryId = searchParams.get('categoryId');
    const brandId = searchParams.get('brandId');
    const isFeatured = searchParams.get('isFeatured');
    const freeDelivery = searchParams.get('freeDelivery');
    const sort = searchParams.get('sort') ?? 'newest';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const where: any = {
      siteId,
      status: 'ACTIVE',
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(isFeatured === 'true' ? { isFeatured: true } : {}),
      ...(freeDelivery === 'true' ? { freeDelivery: true } : {}),
      ...((minPrice || maxPrice) ? {
        price: {
          ...(minPrice ? { gte: Number(minPrice) } : {}),
          ...(maxPrice ? { lte: Number(maxPrice) } : {}),
        },
      } : {}),
    };

    let orderBy: any;
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ ok: true, data: { items, total, page, limit } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
