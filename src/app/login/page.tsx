'use client';

import { FormEvent, useState } from 'react';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = '/dashboard';
        return;
      }

      if (res.status === 401) {
        setError('Invalid email or password');
      } else if (res.status === 400) {
        const data = await res.json();
        setFieldErrors(data.details ?? {});
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to connect. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(229,25,62,0.06)_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.04)_0%,_transparent_50%)]" />

      <div className="animate-fade-in-up w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/tsd-logo.png"
            alt="Top Shot Drones"
            className="mx-auto mb-5 h-20 w-auto drop-shadow-[0_0_30px_rgba(229,25,62,0.2)]"
          />
          <h1 className="text-2xl font-bold tracking-tight gradient-text">
            Top Shot Drones
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <div className="glass-strong rounded-2xl p-7">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-dark block w-full rounded-lg px-3.5 py-2.5 text-sm ${
                  fieldErrors.email ? 'border-[var(--accent)]' : ''
                }`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-[var(--accent)]">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-dark block w-full rounded-lg px-3.5 py-2.5 text-sm ${
                  fieldErrors.password ? 'border-[var(--accent)]' : ''
                }`}
                placeholder="Enter your password"
              />
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-[var(--accent)]">{fieldErrors.password}</p>
              )}
            </div>

            {/* General error */}
            {error && (
              <div className="rounded-lg bg-[rgba(229,25,62,0.1)] border border-[rgba(229,25,62,0.2)] px-3.5 py-2.5">
                <p className="text-xs text-[var(--accent-hover)] text-center">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full rounded-lg px-4 py-2.5 text-sm font-semibold tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
