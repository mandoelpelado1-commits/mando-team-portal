import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Vercel serverless has a request body cap; keep uploads well under it.
const MAX_BYTES = 45 * 1024 * 1024;

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Media storage is not configured (BLOB_READ_WRITE_TOKEN missing).' },
      { status: 501 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || 'unknown'}. Use JPG, PNG, WEBP, GIF, MP4, MOV or WEBM.` },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is ${MAX_BYTES / 1024 / 1024}MB.` },
      { status: 413 }
    );
  }

  // Namespace by user so uploads never collide between team members.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const pathname = `posts/${session.user.id}/${Date.now()}-${safeName}`;

  try {
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    });
    return NextResponse.json({
      url: blob.url,
      mediaType: file.type.startsWith('video/') ? 'video' : 'image',
      size: file.size,
      name: file.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Upload failed: ${err.message}` }, { status: 502 });
  }
}
