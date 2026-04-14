'use client';

import { useState } from 'react';

interface Org { id: string; name: string }
interface Membership {
  organizationId: string;
  role: string;
  isDefault: boolean;
  organization: { id: string; name: string };
}

interface Props {
  userId: string;
  memberships: Membership[];
  organizations: Org[];
}

export default function UserMemberships({ userId, memberships: initial, organizations }: Props) {
  const [memberships, setMemberships] = useState(initial);
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF' | 'CUSTOMER' | 'VIEWER'>('CUSTOMER');
  const [busy, setBusy] = useState(false);

  const unassignedOrgs = organizations.filter(
    (o) => !memberships.some((m) => m.organizationId === o.id),
  );

  async function add() {
    if (!orgId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId: orgId, role }),
      });
      if (res.ok) {
        const m = await res.json();
        setMemberships((list) => [...list, m]);
        setOrgId('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(organizationId: string) {
    if (!confirm('Remove this team membership?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/memberships', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId }),
      });
      if (res.ok) {
        setMemberships((list) => list.filter((m) => m.organizationId !== organizationId));
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(organizationId: string, newRole: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId, role: newRole }),
      });
      if (res.ok) {
        setMemberships((list) =>
          list.map((m) => (m.organizationId === organizationId ? { ...m, role: newRole } : m)),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {memberships.length === 0 ? (
          <span className="text-xs text-[var(--text-muted)]">No teams</span>
        ) : (
          memberships.map((m) => (
            <span
              key={m.organizationId}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px]"
              title={m.role}
            >
              {m.organization.name}
              <span className="text-[9px] text-[var(--text-muted)]">· {m.role}</span>
            </span>
          ))
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] text-[var(--accent)] hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-2">
      {memberships.map((m) => (
        <div key={m.organizationId} className="flex items-center gap-2">
          <span className="flex-1 text-xs">{m.organization.name}</span>
          <select
            value={m.role}
            onChange={(e) => changeRole(m.organizationId, e.target.value)}
            disabled={busy}
            className="input-dark rounded px-1.5 py-0.5 text-[11px]"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="VIEWER">VIEWER</option>
          </select>
          <button
            type="button"
            onClick={() => remove(m.organizationId)}
            disabled={busy}
            className="text-[11px] text-[var(--accent)] hover:underline"
          >
            ×
          </button>
        </div>
      ))}

      {unassignedOrgs.length > 0 && (
        <div className="flex items-center gap-2 border-t border-[var(--border)] pt-2">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="input-dark flex-1 rounded px-1.5 py-0.5 text-[11px]"
          >
            <option value="">Add team…</option>
            {unassignedOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="input-dark rounded px-1.5 py-0.5 text-[11px]"
          >
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="VIEWER">VIEWER</option>
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            type="button"
            onClick={add}
            disabled={busy || !orgId}
            className="rounded bg-[var(--accent)] px-2 py-0.5 text-[11px] text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[11px] text-[var(--text-muted)] hover:underline"
      >
        Done
      </button>
    </div>
  );
}
