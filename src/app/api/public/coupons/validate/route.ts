export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getSiteId(): Promise<string | null> {
  const site = await prisma.site.findUnique({ where: { domain: 'pakdealshub.com' }, select: { id: true } });
  return site?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const siteId = await getSiteId();
    if (!siteId) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ ok: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findFirst({
      where: { siteId, code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ ok: false, error: 'Invalid coupon' }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ ok: false, error: 'Invalid coupon' }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ ok: false, error: 'Coupon expired' }, { status: 400 });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ ok: false, error: 'Usage limit reached' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscount: coupon.maxDiscount,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
