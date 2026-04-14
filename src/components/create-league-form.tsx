'use client';

import { FormEvent, useState } from 'react';

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateLeagueForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
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
      const res = await fetch('/api/admin/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug, description: description.trim() || undefined }),
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
          if (err.path?.[0]) mapped[err.path[0]] = err.message;
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
      className="max-w-md space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
    >
      {error && (
        <div className="rounded-lg bg-[rgba(229,25,62,0.1)] border border-[rgba(229,25,62,0.2)] px-3.5 py-2.5 text-sm text-[var(--accent-hover)]">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="league-name"
          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
        >
          Name
        </label>
        <input
          id="league-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          placeholder="Fall 2025 League"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-[var(--accent)]">{fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="league-slug"
          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
        >
          Slug
        </label>
        <input
          id="league-slug"
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          required
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm font-mono"
          placeholder="fall-2025"
        />
        {fieldErrors.slug && (
          <p className="mt-1 text-xs text-[var(--accent)]">{fieldErrors.slug}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="league-description"
          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
        >
          Description <span className="normal-case font-normal text-[var(--text-muted)]">(optional)</span>
        </label>
        <input
          id="league-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          placeholder="Regional youth lacrosse league"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
      >
        {submitting ? 'Creating...' : 'Create League'}
      </button>
    </form>
  );
}
