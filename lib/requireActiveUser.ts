import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getUserById, User } from './db';

export type GuardResult =
  | { ok: true; user: User }
  | { ok: false; status: number; error: string };

/**
 * Session guard for data API routes.
 * Blocks users who still have a temporary password so a forced reset can't be
 * skipped by calling the APIs directly.
 */
export async function requireActiveUser(): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, status: 401, error: 'Unauthorized' };

  const user = await getUserById(Number(session.user.id));
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };

  if (user.must_change_password === 1) {
    return { ok: false, status: 403, error: 'You must change your temporary password first.' };
  }

  return { ok: true, user };
}
