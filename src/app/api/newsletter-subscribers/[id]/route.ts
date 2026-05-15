export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, notFound, serverError } from '@/lib/api-response';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const subscriber = await prisma.newsletterSubscriber.update({ where: { id }, data: body });
    return ok(subscriber);
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.newsletterSubscriber.delete({ where: { id } });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
