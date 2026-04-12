import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  return getSessionUser(token);
}
