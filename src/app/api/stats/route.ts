export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, serverError } from '@/lib/api-response';
import { subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const oneWeekAgo = subDays(new Date(), 7);

    const [
      totalProducts,
      newProductsThisWeek,
      totalOrders,
      pendingOrders,
      revenueResult,
      totalBrands,
      totalCategories,
      activeCoupons,
      pendingReviews,
      totalBlogs,
      totalCustomers,
      newCustomersThisWeek,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      prisma.product.count({ where: { siteId } }),
      prisma.product.count({ where: { siteId, createdAt: { gte: oneWeekAgo } } }),
      prisma.order.count({ where: { siteId } }),
      prisma.order.count({ where: { siteId, status: 'PENDING' } }),
      prisma.order.aggregate({
        where: { siteId, status: 'DELIVERED' },
        _sum: { finalAmount: true },
      }),
      prisma.brand.count({ where: { siteId } }),
      prisma.category.count({ where: { siteId } }),
      prisma.coupon.count({ where: { siteId, isActive: true } }),
      prisma.review.count({ where: { siteId, isApproved: false } }),
      prisma.blog.count({ where: { siteId } }),
      prisma.customer.count({ where: { siteId } }),
      prisma.customer.count({ where: { siteId, createdAt: { gte: oneWeekAgo } } }),
      prisma.order.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { items: true },
      }),
      prisma.product.findMany({
        where: { siteId, status: 'ACTIVE', stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
        take: 5,
        include: { brand: { select: { name: true } }, category: { select: { name: true } } },
      }),
    ]);

    return ok({
      totalProducts,
      newProductsThisWeek,
      totalOrders,
      pendingOrders,
      totalRevenue: revenueResult._sum.finalAmount ?? 0,
      totalBrands,
      totalCategories,
      activeCoupons,
      pendingReviews,
      totalBlogs,
      totalCustomers,
      newCustomersThisWeek,
      recentOrders,
      lowStockProducts,
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
