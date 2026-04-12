'use client';

import { FormEvent, useState } from 'react';

interface Org {
  id: string;
  name: string;
}

interface Video {
  id: string;
  title: string;
  organizationId: string;
}

export default function InviteUserForm({
  organizations,
  videos,
}: {
  organizations: Org[];
  videos: Video[];
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? '');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter videos by selected org
  const orgVideos = videos.filter((v) => v.organizationId === organizationId);

  function handleVideoToggle(videoId: string) {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId],
    );
  }

  function handleSelectAllToggle() {
    if (selectAll) {
      setSelectAll(false);
      setSelectedVideoIds([]);
    } else {
      setSelectAll(true);
      setSelectedVideoIds([]);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const videoIds = selectAll ? undefined : selectedVideoIds;

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, organizationId, videoIds }),
      });

      if (res.ok) {
        setSuccess(`Invitation sent to ${email}`);
        setEmail('');
        setSelectedVideoIds([]);
        setSelectAll(true);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to send invitation');
      }
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@team.com"
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
          >
            <option value="CUSTOMER">Customer (sees org videos)</option>
            <option value="VIEWER">Viewer (video-level access)</option>
            <option value="STAFF">Staff (manage org)</option>
            <option value="ADMIN">Admin (full access)</option>
          </select>
        </div>

        {/* Organization */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            Organization
          </label>
          <select
            value={organizationId}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              setSelectedVideoIds([]);
              setSelectAll(true);
            }}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>

      {/* Video access — show for VIEWER role or when user wants granular control */}
      {(role === 'VIEWER' || !selectAll) && orgVideos.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Video Access ({selectedVideoIds.length} selected)
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-48 overflow-y-auto">
            {orgVideos.map((video) => (
              <label
                key={video.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  selectedVideoIds.includes(video.id)
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedVideoIds.includes(video.id)}
                  onChange={() => handleVideoToggle(video.id)}
                  className="sr-only"
                />
                <span className="truncate">{video.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Toggle granular access for non-VIEWER roles */}
      {role !== 'VIEWER' && (
        <button
          type="button"
          onClick={handleSelectAllToggle}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {selectAll ? 'Choose specific videos instead of all org videos' : 'Give access to all org videos'}
        </button>
      )}

      {error && (
        <p className="text-sm text-[var(--accent)]">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">{success}</p>
      )}
    </form>
  );
}
