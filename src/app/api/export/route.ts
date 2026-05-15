export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

type Row = Record<string, string | number | boolean | null>;

function toCSV(rows: Row[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
}

function toXLSX(rows: Row[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function fmt(d: Date | null | undefined) {
  return d ? d.toISOString().split('T')[0] : '';
}

async function fetchProducts(siteId: string, sp: URLSearchParams): Promise<Row[]> {
  const categoryId = sp.get('categoryId') || undefined;
  const brandId = sp.get('brandId') || undefined;
  const status = sp.get('status') || undefined;
  const search = sp.get('search') || undefined;

  const rows = await prisma.product.findMany({
    where: {
      siteId,
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { brand: { select: { name: true } }, category: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(p => ({
    Name: p.name,
    SKU: p.sku ?? '',
    Brand: p.brand?.name ?? '',
    Category: p.category?.name ?? '',
    'Price (Rs)': p.price,
    'Compare Price (Rs)': p.comparePrice ?? '',
    Stock: p.stock,
    Status: p.status,
    Featured: p.isFeatured ? 'Yes' : 'No',
    'Free Delivery': p.freeDelivery ? 'Yes' : 'No',
    Warranty: p.warranty ?? '',
    'Created At': fmt(p.createdAt),
  }));
}

async function fetchOrders(siteId: string, sp: URLSearchParams): Promise<Row[]> {
  const status = sp.get('status') || undefined;
  const paymentStatus = sp.get('paymentStatus') || undefined;

  const rows = await prisma.order.findMany({
    where: {
      siteId,
      ...(status ? { status: status as any } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(o => ({
    'Order #': o.orderNumber,
    Customer: o.customerName,
    Email: o.customerEmail,
    Phone: o.customerPhone ?? '',
    City: o.city ?? '',
    'Total (Rs)': o.totalAmount,
    'Discount (Rs)': o.discountAmount,
    'Delivery (Rs)': o.deliveryCharges,
    'Final (Rs)': o.finalAmount,
    Status: o.status,
    Payment: o.paymentMethod ?? '',
    'Payment Status': o.paymentStatus,
    Items: o.items.length,
    'Created At': fmt(o.createdAt),
  }));
}

async function fetchReviews(siteId: string, sp: URLSearchParams): Promise<Row[]> {
  const isApproved = sp.get('isApproved');
  const rating = sp.get('rating');

  const rows = await prisma.review.findMany({
    where: {
      siteId,
      ...(isApproved !== null ? { isApproved: isApproved === 'true' } : {}),
      ...(rating ? { rating: parseInt(rating) } : {}),
    },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(r => ({
    Product: r.product.name,
    Reviewer: r.reviewer,
    Email: r.email ?? '',
    Rating: r.rating,
    Title: r.title ?? '',
    Comment: r.comment ?? '',
    Approved: r.isApproved ? 'Yes' : 'No',
    'Created At': fmt(r.createdAt),
  }));
}

async function fetchBlogs(siteId: string, sp: URLSearchParams): Promise<Row[]> {
  const status = sp.get('status') || undefined;
  const search = sp.get('search') || undefined;

  const rows = await prisma.blog.findMany({
    where: {
      siteId,
      ...(status ? { status: status as any } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: {
      blogCategory: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(b => ({
    Title: b.title,
    Slug: b.slug,
    Status: b.status,
    Category: b.blogCategory?.name ?? '',
    Tags: b.tags.map(t => t.tag.name).join(', '),
    'Published At': fmt(b.publishedAt),
    'Reading Time': b.readingTime ?? '',
    'Created At': fmt(b.createdAt),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const siteId = req.headers.get('x-site-id') ?? '';
    const sp = new URL(req.url).searchParams;
    const entity = sp.get('entity') ?? '';
    const format = sp.get('format') === 'xlsx' ? 'xlsx' : 'csv';

    let rows: Row[];
    let filename: string;

    switch (entity) {
      case 'products':
        rows = await fetchProducts(siteId, sp);
        filename = 'products';
        break;
      case 'orders':
        rows = await fetchOrders(siteId, sp);
        filename = 'orders';
        break;
      case 'reviews':
        rows = await fetchReviews(siteId, sp);
        filename = 'reviews';
        break;
      case 'blogs':
        rows = await fetchBlogs(siteId, sp);
        filename = 'blogs';
        break;
      default:
        return NextResponse.json({ ok: false, error: 'Unknown entity' }, { status: 400 });
    }

    const ts = new Date().toISOString().slice(0, 10);

    if (format === 'xlsx') {
      const buf = toXLSX(rows, entity);
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}-${ts}.xlsx"`,
        },
      });
    }

    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}-${ts}.csv"`,
      },
    });
  } catch (e) {
    console.error('[export]', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 500 });
  }
}
