'use client';

import { useState, type FormEvent } from 'react';

interface Props {
  organizations: { id: string; name: string }[];
  currentUserId: string;
}

export function RegisterVideoForm({ organizations, currentUserId }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cloudflareVideoId, setCloudflareVideoId] = useState('');
  const [organizationId, setOrganizationId] = useState(
    organizations.length === 1 ? organizations[0].id : '',
  );
  const [visibility, setVisibility] = useState<'PUBLIC' | 'ORG' | 'PRIVATE'>('ORG');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          cloudflareVideoId,
          organizationId,
          visibility,
          thumbnailUrl: thumbnailUrl || undefined,
        }),
      });

      if (res.status === 409) {
        setError('Cloudflare Video ID already registered');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
        return;
      }

      window.location.reload();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
    >
      {error && (
        <div className="rounded-lg bg-[rgba(229,25,62,0.1)] border border-[rgba(229,25,62,0.2)] px-4 py-3 text-sm text-[var(--accent-hover)]">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          placeholder="Video title"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Description <span className="text-[var(--text-muted)]">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          placeholder="Brief description"
        />
      </div>

      <div>
        <label htmlFor="cfVideoId" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Cloudflare Video ID
        </label>
        <input
          id="cfVideoId"
          type="text"
          required
          value={cloudflareVideoId}
          onChange={(e) => setCloudflareVideoId(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 font-mono text-sm"
          placeholder="e.g. 5d5bc37ffcf54c9b82e996823bffbb81"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="orgId" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Organization
          </label>
          <select
            id="orgId"
            required
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            <option value="">Select organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="visibility" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Visibility
          </label>
          <select
            id="visibility"
            required
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'ORG' | 'PRIVATE')}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            <option value="PUBLIC">Public</option>
            <option value="ORG">Organization</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="thumbnailUrl" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Thumbnail URL <span className="text-[var(--text-muted)]">(optional)</span>
        </label>
        <input
          id="thumbnailUrl"
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          placeholder="https://..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
      >
        {submitting ? 'Registering...' : 'Register Video'}
      </button>
    </form>
  );
}
