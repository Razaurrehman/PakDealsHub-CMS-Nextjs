export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';
import { ok } from '@/lib/api-response';

export async function POST(_req: NextRequest) {
  const res = ok({ message: 'Logged out' });
  res.cookies.set(clearAuthCookie());
  return res;
}
