export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getSiteId(): Promise<string | null> {
  const site = await prisma.site.findUnique({ where: { domain: 'pakdealshub.com' }, select: { id: true } });
  return site?.id ?? null;
}

function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PDH-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const siteId = await getSiteId();
    if (!siteId) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      paymentMethod,
      couponCode,
      items,
      totalAmount,
      discountAmount,
      deliveryCharges,
      finalAmount,
    } = body;

    if (!customerName || !customerPhone || !address || !city || !paymentMethod || !items?.length) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    let couponId: string | undefined;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { siteId, code: couponCode, isActive: true },
      });
      if (coupon) {
        couponId = coupon.id;
      }
    }

    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          siteId,
          orderNumber,
          customerName,
          customerEmail: customerEmail ?? '',
          customerPhone,
          address,
          city,
          paymentMethod,
          couponId: couponId ?? null,
          totalAmount: totalAmount ?? 0,
          discountAmount: discountAmount ?? 0,
          deliveryCharges: deliveryCharges ?? 0,
          finalAmount: finalAmount ?? totalAmount ?? 0,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      });

      await tx.orderItem.createMany({
        data: items.map((item: any) => ({
          orderId: newOrder.id,
          productId: item.productId,
          name: item.name,
          image: item.image ?? '',
          price: item.price,
          qty: item.qty,
          variant: item.variant ?? '',
          subtotal: item.subtotal,
        })),
      });

      return newOrder;
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        finalAmount: order.finalAmount,
      },
    });
  } catch (e: any) {
    console.error('Order creation error:', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
