import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setUserAvatar, getUserById, logActivity } from '@/lib/db';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Media storage is not configured (BLOB_READ_WRITE_TOKEN missing).' }, { status: 501 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type || 'unknown'}. Use JPG, PNG, WEBP or GIF.` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 5MB.` }, { status: 413 });
  }

  try {
    const previous = await getUserById(userId);
    const blob = await put(`avatars/${userId}/${Date.now()}.${file.type.split('/')[1]}`, file, {
      access: 'public',
      contentType: file.type,
    });
    await setUserAvatar(userId, blob.url);

    // Best-effort cleanup of the old avatar file — never fails the request.
    if (previous?.avatar_url) {
      try {
        await del(previous.avatar_url);
      } catch {
        // ignore
      }
    }

    await logActivity(userId, 'settings', 'avatar_updated', 'Updated profile picture');
    return NextResponse.json({ avatarUrl: blob.url });
  } catch (err: any) {
    return NextResponse.json({ error: `Upload failed: ${err.message}` }, { status: 502 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  const current = await getUserById(userId);
  if (current?.avatar_url) {
    try {
      await del(current.avatar_url);
    } catch {
      // ignore
    }
  }
  await setUserAvatar(userId, null);
  return NextResponse.json({ ok: true });
}
