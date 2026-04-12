export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import SignOutButton from '@/components/sign-out-button';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) redirect('/login');

  const user = await getSessionUser(token);

  if (!user) redirect('/login');

  const isPrivileged = user.role === 'ADMIN' || user.role === 'STAFF';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-900 text-white">
        {/* Branding */}
        <div className="border-b border-slate-700 px-6 py-5">
          <h1 className="text-lg font-bold tracking-tight">Top Shot Drones</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link
            href="/dashboard"
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/videos"
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            Videos
          </Link>
          {isPrivileged && (
            <Link
              href="/admin"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* User info + Sign Out */}
        <div className="border-t border-slate-700 px-4 py-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
              {user.role}
            </span>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-white p-8">{children}</main>
    </div>
  );
}
