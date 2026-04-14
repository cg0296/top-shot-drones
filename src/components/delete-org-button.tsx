'use client';

import { useState } from 'react';

interface Props {
  orgId: string;
  orgName: string;
  memberCount: number;
  videoCount: number;
}

export default function DeleteOrgButton({ orgId, orgName, memberCount, videoCount }: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const warning =
      memberCount > 0 || videoCount > 0
        ? `Delete "${orgName}"? This will also remove ${memberCount} membership(s) and ${videoCount} video(s). This cannot be undone.`
        : `Delete "${orgName}"? This cannot be undone.`;

    if (!confirm(warning)) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete organization');
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
