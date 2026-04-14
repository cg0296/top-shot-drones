'use client';

import { useState } from 'react';

interface Org { id: string; name: string }

interface Props {
  gameId: string;
  initialTitle: string;
  initialHomeTeamId: string;
  initialAwayTeamId: string | null;
  initialNotes: string | null;
  organizations: Org[];
}

export function EditGameForm({
  gameId,
  initialTitle,
  initialHomeTeamId,
  initialAwayTeamId,
  initialNotes,
  organizations,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [homeTeamId, setHomeTeamId] = useState(initialHomeTeamId);
  const [awayTeamId, setAwayTeamId] = useState(initialAwayTeamId ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          homeTeamId,
          awayTeamId: awayTeamId || null,
          notes: notes.trim() || null,
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
          Game Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Home Team
          </label>
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Away Team
          </label>
          <select
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            <option value="">— None —</option>
            {organizations.filter((o) => o.id !== homeTeamId).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about this game…"
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !homeTeamId}
          className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-sm text-[var(--text-muted)]">Saved</span>
        )}
      </div>
    </div>
  );
}
