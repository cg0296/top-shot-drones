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
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Video title"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Brief description"
        />
      </div>

      {/* Cloudflare Video ID */}
      <div>
        <label htmlFor="cfVideoId" className="mb-1 block text-sm font-medium text-slate-700">
          Cloudflare Video ID
        </label>
        <input
          id="cfVideoId"
          type="text"
          required
          value={cloudflareVideoId}
          onChange={(e) => setCloudflareVideoId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="e.g. 5d5bc37ffcf54c9b82e996823bffbb81"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Organization */}
        <div>
          <label htmlFor="orgId" className="mb-1 block text-sm font-medium text-slate-700">
            Organization
          </label>
          <select
            id="orgId"
            required
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Select organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility */}
        <div>
          <label htmlFor="visibility" className="mb-1 block text-sm font-medium text-slate-700">
            Visibility
          </label>
          <select
            id="visibility"
            required
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'ORG' | 'PRIVATE')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="PUBLIC">Public</option>
            <option value="ORG">Organization</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
      </div>

      {/* Thumbnail URL */}
      <div>
        <label htmlFor="thumbnailUrl" className="mb-1 block text-sm font-medium text-slate-700">
          Thumbnail URL <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="thumbnailUrl"
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="https://..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Registering...' : 'Register Video'}
      </button>
    </form>
  );
}
