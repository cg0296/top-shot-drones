'use client';

import { useEffect, useState, type FormEvent } from 'react';

interface Org { id: string; name: string; slug: string }
interface Season { id: string; name: string; slug: string }
interface Game {
  id: string;
  title: string;
  slug: string;
  playedAt: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string } | null;
}

interface Props {
  organizations: Org[];
}

export function VideoUploadForm({ organizations }: Props) {
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState('');
  const [kind, setKind] = useState('main');

  const [newSeasonName, setNewSeasonName] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);

  const [newGameDate, setNewGameDate] = useState('');
  const [creatingGame, setCreatingGame] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState('');

  // Load seasons when home team changes (season is scoped to home team)
  useEffect(() => {
    if (!homeTeamId) { setSeasons([]); setSeasonId(''); return; }
    fetch(`/api/admin/seasons?organizationId=${homeTeamId}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSeasons(data));
    setSeasonId(''); setGames([]); setGameId('');
  }, [homeTeamId]);

  // Load games when season changes
  useEffect(() => {
    if (!seasonId) { setGames([]); setGameId(''); return; }
    fetch(`/api/admin/games?seasonId=${seasonId}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setGames(data));
  }, [seasonId]);

  async function createSeason() {
    if (!newSeasonName.trim() || !homeTeamId) return;
    setCreatingSeason(true);
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSeasonName.trim(), organizationId: homeTeamId }),
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
    if (!homeTeamId || !newGameDate || !seasonId) return;
    setCreatingGame(true);
    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          homeTeamId,
          awayTeamId: awayTeamId || undefined,
          playedAt: new Date(newGameDate).toISOString(),
        }),
      });
      if (!res.ok) { setError('Failed to create game'); return; }
      const game = await res.json();
      setGames((g) => [game, ...g]);
      setGameId(game.id);
      setNewGameDate('');
    } finally {
      setCreatingGame(false);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setError(''); setStatus(''); setProgress(null);

    if (!file) { setError('Pick a file first'); return; }
    if (!homeTeamId) { setError('Select a home team'); return; }

    setStatus('Requesting upload URL…');

    const urlRes = await fetch('/api/admin/videos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeTeamId,
        awayTeamId: awayTeamId || undefined,
        seasonId: seasonId || undefined,
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
      setStatus(`Upload complete (UID: ${uid}). Run sync once Cloudflare finishes encoding.`);
      setProgress(100);
    }
  }

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

      {/* Teams */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Home Team
          </label>
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm"
            required
          >
            <option value="">Select home team</option>
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

      {/* Season */}
      {homeTeamId && (
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
              placeholder='New season (e.g. "Spring 2026")'
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
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              value={newGameDate}
              onChange={(e) => setNewGameDate(e.target.value)}
              className="input-dark flex-1 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={createGame}
              disabled={creatingGame || !newGameDate || !homeTeamId}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              {creatingGame ? '…' : '+ Add game'}
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            New game uses the selected Home and Away teams above.
          </p>
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
        disabled={!file || !homeTeamId || progress !== null}
        className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold"
      >
        Upload
      </button>
    </form>
  );
}
