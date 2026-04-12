'use client';

import { useState, useEffect } from 'react';

interface ReactionData {
  count: number;
  reacted: boolean;
}

interface Props {
  videoId: string;
}

const EMOJI_MAP: Record<string, { icon: string; label: string }> = {
  fire: { icon: '\uD83D\uDD25', label: 'Fire' },
  heart: { icon: '\u2764\uFE0F', label: 'Love' },
  clap: { icon: '\uD83D\uDC4F', label: 'Clap' },
  mindblown: { icon: '\uD83E\uDD2F', label: 'Mind Blown' },
  trophy: { icon: '\uD83C\uDFC6', label: 'Trophy' },
};

export function VideoReactions({ videoId }: Props) {
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [togglingEmoji, setTogglingEmoji] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/videos/${videoId}/reactions`)
      .then((r) => r.json())
      .then(setReactions)
      .finally(() => setLoading(false));
  }, [videoId]);

  async function toggleReaction(emoji: string) {
    setTogglingEmoji(emoji);

    // Optimistic update
    setReactions((prev) => {
      const current = prev[emoji] || { count: 0, reacted: false };
      return {
        ...prev,
        [emoji]: {
          count: current.reacted ? current.count - 1 : current.count + 1,
          reacted: !current.reacted,
        },
      };
    });

    try {
      const res = await fetch(`/api/videos/${videoId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });

      if (!res.ok) {
        // Revert on failure
        setReactions((prev) => {
          const current = prev[emoji] || { count: 0, reacted: false };
          return {
            ...prev,
            [emoji]: {
              count: current.reacted ? current.count - 1 : current.count + 1,
              reacted: !current.reacted,
            },
          };
        });
      }
    } finally {
      setTogglingEmoji(null);
    }
  }

  if (loading) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(EMOJI_MAP).map(([key, { icon, label }]) => {
        const data = reactions[key] || { count: 0, reacted: false };
        return (
          <button
            key={key}
            onClick={() => toggleReaction(key)}
            disabled={togglingEmoji === key}
            title={label}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
              data.reacted
                ? 'bg-[var(--accent-glow)] border border-[var(--accent)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]'
            } disabled:opacity-50`}
          >
            <span className="text-base leading-none">{icon}</span>
            {data.count > 0 && (
              <span className="text-xs font-medium">{data.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
