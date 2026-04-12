'use client';

import { useState } from 'react';

export function SyncCloudflareButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    ready: number;
    imported: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState('');

  async function handleSync() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/admin/sync-cloudflare', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Sync failed');
        return;
      }
      const data = await res.json();
      setResult(data);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSync}
        disabled={loading}
        className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold"
      >
        {loading ? 'Syncing...' : 'Sync from Cloudflare'}
      </button>
      {result && (
        <span className="text-sm text-[var(--text-secondary)]">
          {result.ready} ready / {result.imported} imported / {result.total} total in CF
        </span>
      )}
      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </div>
  );
}
