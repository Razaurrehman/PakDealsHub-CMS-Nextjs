export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp-store';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const SITE_DOMAIN = 'pakdealshub.com';

export async function POST(req: Request) {
  try {
    const { name, email, phone, password, otp } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ ok: false, error: 'Name, email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!otp) {
      return NextResponse.json({ ok: false, error: 'OTP is required' }, { status: 400 });
    }

    const site = await prisma.site.findUnique({ where: { domain: SITE_DOMAIN }, select: { id: true } });
    if (!site) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const normalEmail = email.toLowerCase().trim();

    const otpResult = verifyOtp(normalEmail, site.id, otp);
    if (otpResult === 'expired') {
      return NextResponse.json({ ok: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }
    if (otpResult === 'invalid') {
      return NextResponse.json({ ok: false, error: 'Incorrect OTP. Please try again.' }, { status: 400 });
    }
    if (otpResult === 'too-many-attempts') {
      return NextResponse.json({ ok: false, error: 'Too many attempts. Please request a new OTP.' }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({
      where: { email_siteId: { email: normalEmail, siteId: site.id } },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: normalEmail,
        phone: phone?.trim() || null,
        passwordHash,
        siteId: site.id,
      },
    });

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
