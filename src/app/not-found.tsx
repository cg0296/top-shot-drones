import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="animate-fade-in-up w-full max-w-sm text-center">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Page not found</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="btn-accent w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
