import { getOrCreateDbUser } from '@/lib/clerk-helpers';

export async function getCurrentUser() {
  return getOrCreateDbUser();
}
