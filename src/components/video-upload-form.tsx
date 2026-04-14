'use client';

import { useEffect, useState, type FormEvent } from 'react';

interface Org { id: string; name: string }
interface Season { id: string; name: string; slug: string }
interface Game { id: string; title: string; slug: string; playedAt: string }

interface Props {
  organizations: Org[];
  defaultOrgId?: string;
}

export function VideoUploadForm({ organizations, defaultOrgId }: Props) {
  const [orgId, setOrgId] = useState(defaultOrgId || (organizations[0]?.id ?? ''));
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState('');
  const [kind, setKind] = useState('main');

  // Inline create: season
  const [newSeasonName, setNewSeasonName] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);

  // Inline create: game
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameOpponent, setNewGameOpponent] = useState('');
  const [newGameDate, setNewGameDate] = useState('');
  const [creatingGame, setCreatingGame] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState('');

  // Load seasons when org changes
  useEffect(() => {
    if (!orgId) return;
    setSeasons([]); setSeasonId(''); setGames([]); setGameId('');
    fetch(`/api/admin/seasons?organizationId=${orgId}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSeasons(data));
  }, [orgId]);

  // Load games when season changes
  useEffect(() => {
    if (!seasonId) { setGames([]); setGameId(''); return; }
    fetch(`/api/admin/games?seasonId=${seasonId}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setGames(data));
  }, [seasonId]);

  async function createSeason() {
    if (!newSeasonName.trim()) return;
    setCreatingSeason(true);
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSeasonName.trim(), organizationId: orgId }),
      });
      if (!res.ok) { setError('Failed to create season'); return; }
      const season = await res.json();
      setSeasons((s) => [season, ...s]);
      setSeasonId(season.id);
      setNewSeasonName('');
    } finally {
      setCreatingSeason(false);
    }
  }

  async function createGame() {
    if (!newGameTitle.trim() || !newGameDate || !seasonId) return;
    setCreatingGame(true);
    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          title: newGameTitle.trim(),
          opponent: newGameOpponent.trim() || undefined,
          playedAt: new Date(newGameDate).toISOString(),
        }),
      });
      if (!res.ok) { setError('Failed to create game'); return; }
      const game = await res.json();
      setGames((g) => [game, ...g]);
      setGameId(game.id);
      setNewGameTitle(''); setNewGameOpponent(''); setNewGameDate('');
    } finally {
      setCreatingGame(false);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setError(''); setStatus(''); setProgress(null);

    if (!file) { setError('Pick a file first'); return; }
    if (!orgId) { setError('Select an organization'); return; }

    setStatus('Requesting upload URL…');

    const urlRes = await fetch('/api/admin/videos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: orgId,
        gameId: gameId || undefined,
        kind: kind || undefined,
        name: file.name,
      }),
    });

    if (!urlRes.ok) {
      const data = await urlRes.json().catch(() => ({}));
      setError(data.error || 'Failed to get upload URL');
      return;
    }

    const { uploadURL, uid } = await urlRes.json();

    setStatus('Uploading to Cloudflare…');

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadURL);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    }).catch((err) => { setError(err.message); });

    if (!error) {
      setStatus(`Upload complete. Cloudflare UID: ${uid}. It will appear in the library once encoding finishes — run sync from Admin > Videos.`);
      setProgress(100);
    }
  }

  const selectedOrg = organizations.find((o) => o.id === orgId);

  return (
    <form onSubmit={handleUpload} className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      {error && (
        <div className="rounded-lg bg-[rgba(229,25,62,0.1)] border border-[rgba(229,25,62,0.2)] px-4 py-3 text-sm text-[var(--accent-hover)]">
          {error}
        </div>
      )}
      {status && !error && (
        <div className="rounded-lg bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] px-4 py-3 text-sm">
          {status}
        </div>
      )}

      {/* Organization */}
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Organization
        </label>
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          required
        >
          <option value="">Select organization</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      {/* Season */}
      {orgId && (
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Season
          </label>
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            <option value="">— No season —</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder={`New season for ${selectedOrg?.name || 'org'} (e.g. "2026 Spring")`}
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              className="input-dark flex-1 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={createSeason}
              disabled={creatingSeason || !newSeasonName.trim()}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              {creatingSeason ? '…' : '+ Add'}
            </button>
          </div>
        </div>
      )}

      {/* Game */}
      {seasonId && (
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Game
          </label>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
          >
            <option value="">— No specific game —</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {new Date(g.playedAt).toLocaleDateString()} · {g.title}
              </option>
            ))}
          </select>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Game title"
              value={newGameTitle}
              onChange={(e) => setNewGameTitle(e.target.value)}
              className="input-dark rounded-lg px-3 py-2 text-sm sm:col-span-1"
            />
            <input
              type="text"
              placeholder="Opponent"
              value={newGameOpponent}
              onChange={(e) => setNewGameOpponent(e.target.value)}
              className="input-dark rounded-lg px-3 py-2 text-sm sm:col-span-1"
            />
            <input
              type="date"
              value={newGameDate}
              onChange={(e) => setNewGameDate(e.target.value)}
              className="input-dark rounded-lg px-3 py-2 text-sm sm:col-span-1"
            />
            <button
              type="button"
              onClick={createGame}
              disabled={creatingGame || !newGameTitle.trim() || !newGameDate}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50 sm:col-span-1"
            >
              {creatingGame ? '…' : '+ Add game'}
            </button>
          </div>
        </div>
      )}

      {/* Kind */}
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Clip Type
        </label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
        >
          <option value="main">Main</option>
          <option value="drone">Drone</option>
          <option value="highlights">Highlights</option>
          <option value="bench">Bench</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* File */}
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Video File
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
          required
        />
        {file && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
          </p>
        )}
      </div>

      {progress !== null && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{progress}%</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!file || !orgId || progress !== null}
        className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
      >
        Upload
      </button>
    </form>
  );
}
