'use client';

import { FormEvent, useState } from 'react';

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateOrgForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug }),
      });

      if (res.status === 201) {
        window.location.reload();
        return;
      }

      const data = await res.json();

      if (res.status === 409) {
        setError('Slug already in use');
      } else if (res.status === 400 && data.errors) {
        const mapped: Record<string, string> = {};
        for (const err of data.errors) {
          if (err.path?.[0]) {
            mapped[err.path[0]] = err.message;
          }
        }
        setFieldErrors(mapped);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor="org-name"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Name
        </label>
        <input
          id="org-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Acme Corp"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="org-slug"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Slug
        </label>
        <input
          id="org-slug"
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="acme-corp"
        />
        {fieldErrors.slug && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.slug}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Create Organization'}
      </button>
    </form>
  );
}
