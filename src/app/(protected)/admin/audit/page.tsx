export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export const metadata = {
  title: 'Audit Log — Top Shot Drones',
};

const actionBadge: Record<string, string> = {
  GRANTED: 'badge-green',
  REVOKED: 'badge-red',
  CREATED: 'badge-blue',
};

function formatMetadata(meta: unknown): string {
  if (meta == null) return '—';
  const json = JSON.stringify(meta);
  return json.length > 60 ? json.slice(0, 60) + '...' : json;
}

export default async function AdminAuditPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const entries = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: { name: true, email: true },
      },
    },
  });

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold tracking-tight gradient-text">Audit Log</h1>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="table-dark min-w-full">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target Entity</th>
              <th>Target ID</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="whitespace-nowrap font-medium text-[var(--text-primary)]">
                  {entry.actor?.name ?? entry.actor?.email ?? '—'}
                </td>
                <td className="whitespace-nowrap">
                  <span className={`badge ${actionBadge[entry.action] ?? 'badge-slate'}`}>
                    {entry.action}
                  </span>
                </td>
                <td className="whitespace-nowrap">{entry.targetEntity}</td>
                <td className="whitespace-nowrap font-mono text-xs">{entry.targetId}</td>
                <td
                  className="max-w-xs truncate"
                  title={entry.metadata ? JSON.stringify(entry.metadata) : undefined}
                >
                  {formatMetadata(entry.metadata)}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[var(--text-muted)]">
                  No audit log entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
