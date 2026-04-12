export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard — Top Shot Drones',
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) redirect('/login');

  const user = await getSessionUser(token);

  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-4xl">
      {/* Welcome heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user.name}
        </h1>
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {user.role}
        </span>
      </div>

      {/* Quick links */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/videos"
          className="group rounded-lg border border-slate-200 p-6 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <h2 className="mb-2 text-lg font-semibold text-slate-900 group-hover:text-slate-700">
            Video Library
          </h2>
          <p className="text-sm text-slate-500">
            Browse and manage your uploaded videos.
          </p>
        </Link>
      </div>
    </div>
  );
}
