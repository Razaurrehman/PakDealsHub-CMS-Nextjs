export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, notFound, serverError } from '@/lib/api-response';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) return notFound();
    // Mark as read
    if (!message.isRead) {
      await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
    }
    return ok({ ...message, isRead: true });
  } catch { return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const message = await prisma.contactMessage.update({ where: { id }, data: body });
    return ok(message);
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.contactMessage.delete({ where: { id } });
    return noContent();
  } catch (e: any) {
    if (e.code === 'P2025') return notFound();
    return serverError();
  }
}
