export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setOtp } from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/mailer';

const SITE_DOMAIN = 'pakdealshub.com';

// Rate-limit: one OTP request per email per 60 seconds
const cooldowns = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 });
    }

    const normalEmail = email.toLowerCase().trim();

    // Cooldown check
    const lastSent = cooldowns.get(normalEmail) ?? 0;
    const remaining = Math.ceil((lastSent + 60_000 - Date.now()) / 1000);
    if (remaining > 0) {
      return NextResponse.json(
        { ok: false, error: `Please wait ${remaining}s before requesting a new code`, retryAfter: remaining },
        { status: 429 }
      );
    }

    const site = await prisma.site.findUnique({ where: { domain: SITE_DOMAIN }, select: { id: true } });
    if (!site) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    // Check if email already registered
    const existing = await prisma.customer.findUnique({
      where: { email_siteId: { email: normalEmail, siteId: site.id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 409 });
    }

    const otp = setOtp(normalEmail, site.id);
    cooldowns.set(normalEmail, Date.now());

    await sendOtpEmail(normalEmail, otp);

    return NextResponse.json({ ok: true, message: 'OTP sent to your email' });
  } catch (err: any) {
    console.error('send-otp error:', err?.message);
    return NextResponse.json({ ok: false, error: 'Failed to send OTP. Check your email address.' }, { status: 500 });
  }
}
