import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllUsers, getUserByUsername, createTeamUser, logActivity, Role } from '@/lib/db';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function generatePassword(length = 14) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4, 9)}-${out.slice(9, 14)}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const users = (await getAllUsers()).map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    role: u.role,
    location: u.location,
    mustChangePassword: u.must_change_password === 1,
    active: u.active !== false,
    createdAt: u.created_at,
  }));
  return NextResponse.json({ users });
}

const VALID_ROLES: Role[] = ['admin', 'manager', 'artist'];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const body = await req.json();
  const username = String(body.username || '').trim().toLowerCase();
  const displayName = String(body.displayName || '').trim();
  const location = String(body.location || '').trim();
  const role: Role = body.role;

  if (!username || !/^[a-z0-9_-]{2,30}$/.test(username)) {
    return NextResponse.json({ error: 'Username must be 2-30 characters: letters, numbers, - or _.' }, { status: 400 });
  }
  if (!displayName || !location || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Display name, location and a valid role are required.' }, { status: 400 });
  }
  if (await getUserByUsername(username)) {
    return NextResponse.json({ error: `Username "${username}" is already taken.` }, { status: 409 });
  }

  const tempPassword = generatePassword();
  const id = await createTeamUser({
    username,
    passwordHash: bcrypt.hashSync(tempPassword, 10),
    displayName,
    role,
    location,
  });

  await logActivity(Number(session.user.id), 'admin', 'user_created', `Created account for ${displayName} (${username})`);

  return NextResponse.json({ id, username, tempPassword });
}
