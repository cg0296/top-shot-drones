'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  targetName: string;
  targetEmail: string;
  realName: string;
}

export default function ImpersonationBanner({ targetName, targetEmail, realName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' });
      router.push('/dashboard');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-[var(--accent)] px-4 py-2 text-xs text-white shadow">
      <span>
        <span className="font-semibold">{realName}</span> viewing as{' '}
        <span className="font-semibold">{targetName}</span>{' '}
        <span className="opacity-75">({targetEmail})</span>
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={busy}
        className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold transition hover:bg-white/30 disabled:opacity-50"
      >
        {busy ? 'Stopping…' : 'Stop'}
      </button>
    </div>
  );
}
