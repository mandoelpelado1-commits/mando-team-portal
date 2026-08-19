import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Read the DB rather than trusting the JWT: the token is only refreshed on
  // update(), so a stale token must not grant access past the forced change.
  const user = await getUserById(Number(session.user.id));
  if (user?.must_change_password === 1) {
    redirect('/change-password');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
