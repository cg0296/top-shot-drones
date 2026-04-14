'use client';

import { useState } from 'react';

interface Team {
  id: string;
  name: string;
}

interface Props {
  leagueId: string;
  leagueName: string;
  currentTeams: Team[];
  availableTeams: Team[]; // orgs not yet in this league
}

export default function LeagueTeamManager({
  leagueId,
  leagueName,
  currentTeams,
  availableTeams,
}: Props) {
  const [teams, setTeams] = useState<Team[]>(currentTeams);
  const [available, setAvailable] = useState<Team[]>(availableTeams);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!selectedOrgId) return;
    setAdding(true);
    setError('');

    try {
      const res = await fetch('/api/admin/league-memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, orgId: selectedOrgId }),
      });

      if (res.ok) {
        const added = available.find((t) => t.id === selectedOrgId)!;
        setTeams((prev) => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
        setAvailable((prev) => prev.filter((t) => t.id !== selectedOrgId));
        setSelectedOrgId('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to add team');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(orgId: string) {
    setRemovingId(orgId);
    setError('');

    try {
      const res = await fetch('/api/admin/league-memberships', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, orgId }),
      });

      if (res.ok) {
        const removed = teams.find((t) => t.id === orgId)!;
        setTeams((prev) => prev.filter((t) => t.id !== orgId));
        setAvailable((prev) => [...prev, removed].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to remove team');
      }
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-[var(--accent)]">{error}</p>
      )}

      {/* Current teams */}
      {teams.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic">No teams yet — add one below</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
            >
              {t.name}
              <button
                onClick={() => handleRemove(t.id)}
                disabled={removingId === t.id}
                aria-label={`Remove ${t.name} from ${leagueName}`}
                className="ml-0.5 rounded-full p-0.5 text-[var(--text-muted)] transition hover:bg-[rgba(229,25,62,0.15)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                {removingId === t.id ? (
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add team */}
      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="input-dark rounded-lg px-3 py-1.5 text-xs"
          >
            <option value="">Add team...</option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedOrgId || adding}
            className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {adding ? 'Adding...' : '+ Add'}
          </button>
        </div>
      )}
    </div>
  );
}
