export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, serverError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, role: true, avatar: true, isActive: true },
    });
    if (!user || !user.isActive) return unauthorized();

    return ok(user);
  } catch {
    return serverError();
  }
}
