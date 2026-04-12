'use client';

import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
}

interface Props {
  user: User;
  organizations: { id: string; name: string }[];
  currentUserId: string;
}

const ROLES = ['ADMIN', 'STAFF', 'CUSTOMER', 'VIEWER'] as const;

export default function UserActions({ user, organizations, currentUserId }: Props) {
  const [changingRole, setChangingRole] = useState(false);
  const [changingOrg, setChangingOrg] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSelf = user.id === currentUserId;

  async function handleRoleChange(newRole: string) {
    if (newRole === user.role) return;
    setChangingRole(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // silently fail — reload won't happen so user sees no change
    } finally {
      setChangingRole(false);
    }
  }

  async function handleOrgChange(newOrgId: string) {
    const organizationId = newOrgId === '' ? null : newOrgId;
    if (organizationId === user.organizationId) return;
    setChangingOrg(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // silently fail
    } finally {
      setChangingOrg(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Role selector */}
      <select
        value={user.role}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={isSelf || changingRole}
        className="input-dark rounded-md px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {/* Organization selector */}
      <select
        value={user.organizationId ?? ''}
        onChange={(e) => handleOrgChange(e.target.value)}
        disabled={changingOrg}
        className="input-dark rounded-md px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">None</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isSelf || deleting}
        className="rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(229,25,62,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
        title={isSelf ? 'Cannot delete yourself' : `Delete ${user.name}`}
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
