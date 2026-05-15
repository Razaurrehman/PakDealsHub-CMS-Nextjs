/**
 * Honeypot endpoint — linked only in robots.txt Disallow.
 * Any visitor (bot that ignores robots.txt) gets its IP banned for 24 h.
 * Returns 404 so the bot learns nothing useful.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { banIp, getIp } from '@/lib/bot-detection';

export async function GET(req: NextRequest) {
  const ip = getIp(req);
  banIp(ip, 'honeypot');
  return new NextResponse(null, { status: 404 });
}
