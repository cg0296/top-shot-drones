'use client';

import { useState } from 'react';

interface Game {
  id: string;
  title: string;
  playedAt: string;
  homeTeam: { name: string };
  awayTeam: { name: string } | null;
}

interface Org {
  id: string;
  name: string;
}

interface Props {
  videoId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialVisibility: 'PUBLIC' | 'ORG' | 'PRIVATE';
  initialOrganizationId: string;
  initialGameId: string | null;
  organizations: Org[];
  games: Game[];
}

export function EditVideoForm({
  videoId,
  initialTitle,
  initialDescription,
  initialVisibility,
  initialOrganizationId,
  initialGameId,
  organizations,
  games,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [visibility, setVisibility] = useState(initialVisibility);
  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [gameId, setGameId] = useState(initialGameId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          visibility,
          organizationId,
          gameId: gameId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-[rgba(229,25,62,0.1)] border border-[rgba(229,25,62,0.2)] px-4 py-3 text-sm text-[var(--accent-hover)]">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Description <span className="normal-case font-normal text-[var(--text-muted)]">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description…"
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Organization
          </label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'ORG' | 'PRIVATE')}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            <option value="PUBLIC">Public — anyone signed in</option>
            <option value="ORG">Org — team members only</option>
            <option value="PRIVATE">Private — explicit grants only</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Linked Game <span className="normal-case font-normal text-[var(--text-muted)]">(optional)</span>
          </label>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            <option value="">— None —</option>
            {games.map((g) => {
              const opponent = g.awayTeam?.name ?? 'TBD';
              const label = `${g.homeTeam.name} vs ${opponent} · ${new Date(g.playedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
              return (
                <option key={g.id} value={g.id}>{label}</option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-sm text-[var(--text-muted)]">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
