export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bannerSchema } from '@/lib/validations';
import { ok, noContent, badRequest, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) return notFound();
    return ok(banner);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const banner = await prisma.banner.update({ where: { id }, data: parsed.data });
    await logActivity({ userId, action: 'UPDATE', entity: 'Banner', entityId: id, siteId, ...getClientInfo(req) });
    return ok(banner);
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    await prisma.banner.delete({ where: { id } });
    await logActivity({ userId, action: 'DELETE', entity: 'Banner', entityId: id, siteId, ...getClientInfo(req) });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
