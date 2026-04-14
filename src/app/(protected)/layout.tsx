export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAuthContext } from '@/lib/clerk-helpers';
import { UserButton } from '@clerk/nextjs';
import ImpersonationBanner from '@/components/impersonation-banner';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { realUser, effectiveUser, impersonating } = await getAuthContext();

  if (!effectiveUser) redirect('/sign-in');

  const user = effectiveUser;
  const isPrivileged = user.role === 'ADMIN' || user.role === 'STAFF';

  return (
    <>
      {impersonating && realUser && (
        <ImpersonationBanner
          targetName={impersonating.name}
          targetEmail={impersonating.email}
          realName={realUser.name}
        />
      )}
      <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[200px] flex-col items-center border-r border-[var(--border)] bg-[var(--bg-secondary)] py-6 md:flex">
        <Link href="/dashboard" className="mb-2 transition-transform hover:scale-105">
          <div className="rounded-xl bg-white/90 p-2.5">
            <Image src="/tsd-logo.png" alt="Top Shot Drones" width={120} height={120} />
          </div>
        </Link>

        <div className="mb-4 h-px w-20 bg-[var(--border)]" />

        <nav className="flex flex-1 flex-col gap-1 w-full px-3">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition-all hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            Dashboard
          </Link>
          <Link href="/videos" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition-all hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Videos
          </Link>
          <Link href="/orgs" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition-all hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Teams
          </Link>
          {isPrivileged && (
            <Link href="/admin/upload" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition-all hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              Upload
            </Link>
          )}
          {isPrivileged && (
            <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition-all hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </Link>
          )}
        </nav>

        <div className="w-full border-t border-[var(--border)] px-3 pt-4">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <UserButton />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar — visible on mobile only */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-lg bg-white/90 p-1.5">
            <Image src="/tsd-logo.png" alt="Top Shot Drones" width={28} height={28} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Top Shot Drones</span>
        </Link>
        <UserButton />
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-screen bg-[var(--bg-primary)] md:ml-[200px]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — visible on mobile only */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-[var(--bg-secondary)] py-2 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 px-3 py-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <span className="text-[10px]">Home</span>
        </Link>
        <Link href="/videos" className="flex flex-col items-center gap-0.5 px-3 py-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          <span className="text-[10px]">Videos</span>
        </Link>
        {isPrivileged && (
          <Link href="/admin" className="flex flex-col items-center gap-0.5 px-3 py-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px]">Admin</span>
          </Link>
        )}
      </nav>

      {/* Bottom padding spacer for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
    </>
  );
}
