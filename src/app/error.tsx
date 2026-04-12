'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="animate-fade-in-up w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(229,25,62,0.1)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          An unexpected error occurred. Please try again.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={reset}
            className="btn-accent w-full rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
