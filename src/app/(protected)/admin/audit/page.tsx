export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export const metadata = {
  title: 'Audit Log — Top Shot Drones',
};

const actionBadgeColors: Record<string, string> = {
  GRANTED: 'bg-green-100 text-green-700',
  REVOKED: 'bg-red-100 text-red-700',
  CREATED: 'bg-blue-100 text-blue-700',
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
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Audit Log</h1>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Actor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Target Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Target ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Metadata
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                  {entry.actor?.name ?? entry.actor?.email ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionBadgeColors[entry.action] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {entry.targetEntity}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 font-mono text-xs">
                  {entry.targetId}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-500" title={entry.metadata ? JSON.stringify(entry.metadata) : undefined}>
                  {formatMetadata(entry.metadata)}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-slate-400"
                >
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
