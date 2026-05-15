export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productSchema } from '@/lib/validations';
import { ok, noContent, badRequest, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { slugify } from '@/lib/utils';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { brand: true, category: true, reviews: true },
    });
    if (!product) return notFound();
    return ok(product);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const product = await prisma.product.update({ where: { id }, data: { ...parsed.data, slug } });
    await logActivity({ userId, action: 'UPDATE', entity: 'Product', entityId: id, siteId, ...getClientInfo(req) });
    return ok(product);
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    if (e.code === 'P2002') return badRequest('Slug already exists');
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    await prisma.product.delete({ where: { id } });
    await logActivity({ userId, action: 'DELETE', entity: 'Product', entityId: id, siteId, ...getClientInfo(req) });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
