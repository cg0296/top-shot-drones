'use client';

import { useState } from 'react';
import UserActions from '@/components/user-actions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string;
}

interface Org {
  id: string;
  name: string;
}

const roleBadge: Record<string, string> = {
  ADMIN: 'badge-red',
  STAFF: 'badge-blue',
  CUSTOMER: 'badge-green',
  VIEWER: 'badge-slate',
};

export default function UserTable({
  users,
  organizations,
  currentUserId,
}: {
  users: User[];
  organizations: Org[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (orgFilter && u.organizationId !== orgFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark rounded-lg px-3 py-2 text-sm w-full sm:w-64"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-dark rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="CUSTOMER">Customer</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="input-dark rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Organizations</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        {(search || roleFilter || orgFilter) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); setOrgFilter(''); }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {filtered.length} of {users.length} users
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="table-dark min-w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organization</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-[var(--text-primary)]">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${roleBadge[u.role] ?? 'badge-slate'}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.organizationName ?? '—'}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <UserActions
                    user={{
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      role: u.role,
                      organizationId: u.organizationId,
                    }}
                    organizations={organizations}
                    currentUserId={currentUserId}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[var(--text-muted)]">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
