'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  videoId: string;
  videoTitle: string;
  redirectTo?: string;
  className?: string;
}

export default function DeleteVideoButton({
  videoId,
  videoTitle,
  redirectTo,
  className,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Remove "${videoTitle}" from the app? The underlying Cloudflare Stream video stays intact — you can re-sync it later if needed.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete video');
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className={
        className ??
        'rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(229,25,62,0.1)] disabled:cursor-not-allowed disabled:opacity-50'
      }
      title={`Delete ${videoTitle}`}
    >
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}
