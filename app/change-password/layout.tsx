import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export default async function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Already done? Nothing to force — send them to the portal.
  const user = await getUserById(Number(session.user.id));
  if (user?.must_change_password !== 1) redirect('/dashboard');

  return <>{children}</>;
}
