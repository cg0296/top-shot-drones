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
        <div className="rounded-lg bg-[rgba(229,25,62,0.1)] border border-[rgba(229,25,62,0.2)] px-4 py-3 text-sm text-[var(--accent-hover)]">
          {error}
        </div>
      )}

      {/* Current grants table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="table-dark min-w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Access Type</th>
              <th>Granted</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grants.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-[var(--text-muted)]">
                  No access grants yet
                </td>
              </tr>
            ) : (
              grants.map((grant) => (
                <tr key={grant.id}>
                  <td className="whitespace-nowrap font-medium text-[var(--text-primary)]">
                    {grant.userName}
                  </td>
                  <td className="whitespace-nowrap">{grant.userEmail}</td>
                  <td className="whitespace-nowrap">
                    <span className="badge badge-blue">{grant.accessType}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    {new Date(grant.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      onClick={() => handleRevoke(grant.userId)}
                      disabled={revokingId === grant.userId}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(229,25,62,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
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
        <p className="text-sm text-[var(--text-muted)]">
          All users already have access
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Grant Access
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="grant-user"
                className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                User
              </label>
              <select
                id="grant-user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
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
              className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
            >
              {granting ? 'Granting...' : 'Grant'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
