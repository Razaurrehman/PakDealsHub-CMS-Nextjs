export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const SITE_DOMAIN = 'pakdealshub.com';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email?.trim() || !password) {
      return NextResponse.json({ ok: false, error: 'Email and password are required' }, { status: 400 });
    }

    const site = await prisma.site.findUnique({ where: { domain: SITE_DOMAIN }, select: { id: true } });
    if (!site) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const customer = await prisma.customer.findUnique({
      where: { email_siteId: { email: email.toLowerCase().trim(), siteId: site.id } },
    });

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
    }

    if (!customer.isActive) {
      return NextResponse.json(
        { ok: false, error: 'Your account has been blocked. Please contact support.', code: 'ACCOUNT_BLOCKED' },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await new SignJWT({ sub: customer.id, type: 'customer' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    return NextResponse.json({
      ok: true,
      data: {
        token,
        user: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
