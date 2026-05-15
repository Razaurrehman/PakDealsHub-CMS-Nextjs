export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { blogCategorySchema } from '@/lib/validations';
import { ok, noContent, badRequest, notFound, serverError } from '@/lib/api-response';
import { logActivity, getClientInfo } from '@/lib/activity-log';
import { slugify } from '@/lib/utils';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cat = await prisma.blogCategory.findUnique({ where: { id } });
    if (!cat) return notFound();
    return ok(cat);
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const siteId = req.headers.get('x-site-id') ?? '';
    const userId = req.headers.get('x-user-id') ?? undefined;
    const body = await req.json();
    const parsed = blogCategorySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const cat = await prisma.blogCategory.update({ where: { id }, data: { ...parsed.data, slug } });
    await logActivity({ userId, action: 'UPDATE', entity: 'BlogCategory', entityId: id, siteId, ...getClientInfo(req) });
    return ok(cat);
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
    await prisma.blogCategory.delete({ where: { id } });
    await logActivity({ userId, action: 'DELETE', entity: 'BlogCategory', entityId: id, siteId, ...getClientInfo(req) });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
