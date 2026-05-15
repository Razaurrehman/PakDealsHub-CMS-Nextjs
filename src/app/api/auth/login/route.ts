export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { getDefaultSiteId } from '@/lib/site';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const siteId = await getDefaultSiteId();
    const user = await prisma.user.findUnique({
      where: { email_siteId: { email: parsed.data.email, siteId } },
    });

    if (!user || !user.isActive) return unauthorized('Invalid credentials');
    const valid = bcrypt.compareSync(parsed.data.password, user.passwordHash);
    if (!valid) {
      await logActivity({ action: 'LOGIN_FAILED', entity: 'User', metadata: { email: parsed.data.email }, siteId, ...getClientInfo(req) });
      return unauthorized('Invalid credentials');
    }

    const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role, siteId });
    await logActivity({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, siteId, ...getClientInfo(req) });

    const res = ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    res.cookies.set(setAuthCookie(token));
    return res;
  } catch {
    return serverError();
  }
}
