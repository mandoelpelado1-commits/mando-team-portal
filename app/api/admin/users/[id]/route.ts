import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setUserActive, setUserRole, forcePasswordReset, logActivity, Role } from '@/lib/db';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function generatePassword(length = 14) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4, 9)}-${out.slice(9, 14)}`;
}

const VALID_ROLES: Role[] = ['admin', 'manager', 'artist'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const { id } = await params;
  const targetId = Number(id);
  const adminId = Number(session.user.id);

  if (targetId === adminId) {
    return NextResponse.json({ error: 'You cannot change your own role or active status here.' }, { status: 400 });
  }

  const body = await req.json();
  let tempPassword: string | undefined;

  if (body.action === 'setRole') {
    if (!VALID_ROLES.includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    await setUserRole(targetId, body.role);
    await logActivity(adminId, 'admin', 'role_changed', `User #${targetId} role set to ${body.role}`);
  } else if (body.action === 'setActive') {
    await setUserActive(targetId, Boolean(body.active));
    await logActivity(adminId, 'admin', body.active ? 'user_enabled' : 'user_disabled', `User #${targetId} ${body.active ? 'enabled' : 'disabled'}`);
  } else if (body.action === 'resetPassword') {
    tempPassword = generatePassword();
    await forcePasswordReset(targetId, bcrypt.hashSync(tempPassword, 10));
    await logActivity(adminId, 'admin', 'password_reset', `Password reset for user #${targetId}`);
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tempPassword });
}
