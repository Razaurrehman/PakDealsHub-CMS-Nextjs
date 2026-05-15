export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getDefaultSiteId } from '@/lib/site';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package, ShoppingCart, DollarSign, Award, FolderOpen, Tag,
  Star, FileText, TrendingUp, AlertTriangle, UserCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatPKR, formatDate } from '@/lib/utils';
import { subDays } from 'date-fns';

async function getDashboardData(siteId: string) {
  const oneWeekAgo = subDays(new Date(), 7);

  const [
    totalProducts, newProductsThisWeek, totalOrders, pendingOrders,
    revenueResult, totalBrands, totalCategories, activeCoupons,
    pendingReviews, totalBlogs, totalCustomers, newCustomersThisWeek,
    recentOrders, lowStockProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { siteId } }),
    prisma.product.count({ where: { siteId, createdAt: { gte: oneWeekAgo } } }),
    prisma.order.count({ where: { siteId } }),
    prisma.order.count({ where: { siteId, status: 'PENDING' } }),
    prisma.order.aggregate({ where: { siteId, status: 'DELIVERED' }, _sum: { finalAmount: true } }),
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
      include: { brand: { select: { name: true } } },
    }),
  ]);

  return {
    totalProducts, newProductsThisWeek, totalOrders, pendingOrders,
    totalRevenue: revenueResult._sum.finalAmount ?? 0,
    totalBrands, totalCategories, activeCoupons, pendingReviews, totalBlogs,
    totalCustomers, newCustomersThisWeek,
    recentOrders, lowStockProducts,
  };
}

const orderStatusColors: Record<string, string> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  SHIPPED: 'purple',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

export default async function DashboardPage() {
  const siteId = await getDefaultSiteId();
  const data = await getDashboardData(siteId);

  const stats = [
    {
      label: 'Total Products',
      value: data.totalProducts.toLocaleString(),
      sub: `+${data.newProductsThisWeek} this week`,
      icon: Package,
      href: '/admin/products',
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Total Orders',
      value: data.totalOrders.toLocaleString(),
      sub: `${data.pendingOrders} pending`,
      icon: ShoppingCart,
      href: '/admin/orders',
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
    },
    {
      label: 'Total Revenue',
      value: formatPKR(data.totalRevenue),
      sub: 'Delivered orders',
      icon: DollarSign,
      href: '/admin/orders',
      color: 'text-green-600 bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Customers',
      value: data.totalCustomers.toLocaleString(),
      sub: `+${data.newCustomersThisWeek} this week`,
      icon: UserCircle,
      href: '/admin/customers',
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
    },
    {
      label: 'Brands',
      value: data.totalBrands.toLocaleString(),
      sub: 'Active brands',
      icon: Award,
      href: '/admin/brands',
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Categories',
      value: data.totalCategories.toLocaleString(),
      sub: 'Product categories',
      icon: FolderOpen,
      href: '/admin/categories',
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
    },
    {
      label: 'Active Coupons',
      value: data.activeCoupons.toLocaleString(),
      sub: 'Valid discount codes',
      icon: Tag,
      href: '/admin/coupons',
      color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
    },
    {
      label: 'Pending Reviews',
      value: data.pendingReviews.toLocaleString(),
      sub: 'Awaiting approval',
      icon: Star,
      href: '/admin/reviews',
      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
    },
    {
      label: 'Blog Posts',
      value: data.totalBlogs.toLocaleString(),
      sub: 'Published articles',
      icon: FileText,
      href: '/admin/blogs',
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome to PakDealsHub CMS — Electronics &amp; Home Appliances</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 py-5">
                <div className={`rounded-xl p-3 ${color} shrink-0`}><Icon size={20} /></div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground truncate">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h3 className="font-semibold text-foreground">Recent Orders</h3>
            </div>
            <Link href="/admin/orders" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {data.recentOrders.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">No orders yet</div>
            ) : (
              data.recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.customerName} · {order.city ?? 'N/A'}</p>
                    <p className="text-xs text-muted-foreground/60">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatPKR(order.finalAmount)}</p>
                    <Badge variant={(orderStatusColors[order.status] as any) ?? 'default'}>{order.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Low Stock Products */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <h3 className="font-semibold text-foreground">Low Stock Alert</h3>
            </div>
            <Link href="/admin/products" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {data.lowStockProducts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">All products are well-stocked</div>
            ) : (
              data.lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    {product.thumbnail && (
                      <img src={product.thumbnail} alt="" className="h-8 w-8 rounded object-cover" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.brand?.name ?? 'No Brand'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={product.stock === 0 ? 'danger' : 'warning'}>
                      {product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatPKR(product.price)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
