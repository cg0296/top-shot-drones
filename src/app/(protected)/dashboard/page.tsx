export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard — Top Shot Drones',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/sign-in');

  const isPrivileged = user.role === 'ADMIN' || user.role === 'STAFF';

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, <span className="gradient-text">{user.name}</span>
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <span className={`badge ${
            user.role === 'ADMIN' ? 'badge-red' :
            user.role === 'STAFF' ? 'badge-blue' :
            user.role === 'CUSTOMER' ? 'badge-green' : 'badge-slate'
          }`}>
            {user.role}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick access cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        <Link
          href="/videos"
          className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-xl hover:shadow-black/20"
        >
          <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[var(--accent)] opacity-[0.04] blur-2xl transition-opacity group-hover:opacity-[0.08]" />
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(229,25,62,0.1)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Video Library
          </h2>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Browse and watch your videos
          </p>
        </Link>

        {isPrivileged && (
          <>
            <Link
              href="/admin/videos"
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-xl hover:shadow-black/20"
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500 opacity-[0.04] blur-2xl transition-opacity group-hover:opacity-[0.08]" />
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Manage Videos
              </h2>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                Register and organize content
              </p>
            </Link>

            <Link
              href="/admin/users"
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-xl hover:shadow-black/20"
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-green-500 opacity-[0.04] blur-2xl transition-opacity group-hover:opacity-[0.08]" />
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(34,197,94,0.1)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Users & Access
              </h2>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                Manage users and permissions
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
