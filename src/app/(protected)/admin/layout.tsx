'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminTabs = [
  { href: '/admin/videos', label: 'Videos' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/audit', label: 'Audit Log' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      {/* Admin tab bar */}
      <div className="mb-8 border-b border-[var(--border)]">
        <nav className="flex gap-1">
          {adminTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
