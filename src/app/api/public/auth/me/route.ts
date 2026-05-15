export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'customer') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: payload.sub as string },
      select: { id: true, name: true, email: true, phone: true, avatar: true, isActive: true },
    });

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Account not found' }, { status: 404 });
    }

    if (!customer.isActive) {
      return NextResponse.json(
        { ok: false, error: 'Your account has been blocked.', code: 'ACCOUNT_BLOCKED' },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, data: customer });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'customer') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    }

    const current = await prisma.customer.findUnique({
      where: { id: payload.sub as string },
      select: { isActive: true },
    });
    if (!current?.isActive) {
      return NextResponse.json(
        { ok: false, error: 'Your account has been blocked.', code: 'ACCOUNT_BLOCKED' },
        { status: 403 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id: payload.sub as string },
      data: { name: name.trim(), phone: phone?.trim() || null },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ ok: true, data: customer });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
