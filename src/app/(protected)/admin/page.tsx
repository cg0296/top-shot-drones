import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') redirect('/dashboard');
  redirect('/admin/videos');
}
