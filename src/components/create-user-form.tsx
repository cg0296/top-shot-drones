'use client';

import { FormEvent, useState } from 'react';

interface Props {
  organizations: { id: string; name: string }[];
}

const ROLES = ['ADMIN', 'STAFF', 'CUSTOMER', 'VIEWER'] as const;

export default function CreateUserForm({ organizations }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('VIEWER');
  const [organizationId, setOrganizationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, organizationId }),
      });

      if (res.status === 201) {
        window.location.reload();
        return;
      }

      const body = await res.json();

      if (res.status === 409) {
        setError('Email already in use');
      } else if (res.status === 400 && body.errors) {
        const mapped: Record<string, string> = {};
        for (const err of body.errors) {
          if (err.path?.[0]) {
            mapped[err.path[0]] = err.message;
          }
        }
        setFieldErrors(mapped);
      } else {
        setError(body.error ?? 'Something went wrong');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
    >
      {error && (
        <div className="mb-4 rounded-lg bg-[rgba(229,25,62,0.1)] border border-[rgba(229,25,62,0.2)] px-4 py-3 text-sm text-[var(--accent-hover)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
            placeholder="Jane Doe"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-[var(--accent)]">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
            placeholder="jane@example.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-[var(--accent)]">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
            placeholder="Min 8 characters"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-[var(--accent)]">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {fieldErrors.role && (
            <p className="mt-1 text-xs text-[var(--accent)]">{fieldErrors.role}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Organization
          </label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
            required
          >
            <option value="" disabled>
              Select an organization
            </option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          {fieldErrors.organizationId && (
            <p className="mt-1 text-xs text-[var(--accent)]">{fieldErrors.organizationId}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={submitting}
          className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          {submitting ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
