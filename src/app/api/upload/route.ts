export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { getDefaultSiteId } from '@/lib/site';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, error: 'Invalid file type' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ ok: false, error: 'File too large (max 8MB)' }, { status: 400 });

    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `${nanoid()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/${filename}`;

    // Save to Media table
    try {
      const session = await getSessionFromRequest(req);
      const siteId = session?.siteId ?? await getDefaultSiteId();
      await prisma.media.create({
        data: {
          filename: file.name,
          url,
          mimeType: file.type,
          size: file.size,
          siteId,
        },
      });
    } catch {
      // Don't fail upload if media record fails
    }

    return NextResponse.json({ ok: true, url });
  } catch {
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 });
  }
}
