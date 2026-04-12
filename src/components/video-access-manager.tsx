'use client';

import { useState } from 'react';

interface Grant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  accessType: string;
  createdAt: string;
}

interface EligibleUser {
  id: string;
  name: string;
  email: string;
}

interface Props {
  videoId: string;
  grants: Grant[];
  eligibleUsers: EligibleUser[];
}

export function VideoAccessManager({ videoId, grants, eligibleUsers }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleGrant() {
    if (!selectedUserId) return;
    setError('');
    setGranting(true);

    try {
      const res = await fetch('/api/admin/video-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          userId: selectedUserId,
          accessType: 'VIEW',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to grant access');
        return;
      }

      window.location.reload();
    } catch {
      setError('Network error');
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(userId: string) {
    setError('');
    setRevokingId(userId);

    try {
      const res = await fetch('/api/admin/video-access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to revoke access');
        return;
      }

      window.location.reload();
    } catch {
      setError('Network error');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current grants table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Access Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Granted
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {grants.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  No access grants yet
                </td>
              </tr>
            ) : (
              grants.map((grant) => (
                <tr key={grant.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                    {grant.userName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {grant.userEmail}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {grant.accessType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                    {new Date(grant.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(grant.userId)}
                      disabled={revokingId === grant.userId}
                      className="rounded-md px-3 py-1 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {revokingId === grant.userId ? 'Revoking...' : 'Revoke'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Grant access form */}
      {eligibleUsers.length === 0 ? (
        <p className="text-sm text-slate-400">
          All users already have access
        </p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Grant Access
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="grant-user"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                User
              </label>
              <select
                id="grant-user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="">Select a user</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGrant}
              disabled={!selectedUserId || granting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {granting ? 'Granting...' : 'Grant'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
