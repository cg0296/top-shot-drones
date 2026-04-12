'use client';

import { useState, useEffect, type FormEvent } from 'react';

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface Props {
  videoId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function VideoComments({ videoId, currentUserId, isAdmin }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then(setComments)
      .finally(() => setLoading(false));
  }, [videoId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setBody('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);

    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
        Comments
        {comments.length > 0 && (
          <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
            ({comments.length})
          </span>
        )}
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)]">
          {/* Current user initial */}
          ?
        </div>
        <div className="flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            maxLength={2000}
            className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm resize-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="btn-accent rounded-lg px-4 py-1.5 text-xs font-semibold"
            >
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <svg className="h-5 w-5 animate-spin text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="group flex gap-3 animate-fade-in"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)]">
                {comment.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {comment.user.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {timeAgo(comment.createdAt)}
                  </span>
                  {(comment.user.id === currentUserId || isAdmin) && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-all disabled:opacity-50"
                    >
                      {deletingId === comment.id ? '...' : 'Delete'}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
