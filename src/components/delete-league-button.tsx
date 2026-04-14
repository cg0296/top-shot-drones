'use client';

import { useState } from 'react';

interface Props {
  leagueId: string;
  leagueName: string;
  teamCount: number;
}

export default function DeleteLeagueButton({ leagueId, leagueName, teamCount }: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const warning =
      teamCount > 0
        ? `Delete "${leagueName}"? This will also remove ${teamCount} team membership(s). This cannot be undone.`
        : `Delete "${leagueName}"? This cannot be undone.`;

    if (!confirm(warning)) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/leagues/${leagueId}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete league');
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(229,25,62,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}
