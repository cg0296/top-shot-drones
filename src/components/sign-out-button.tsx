'use client';

export default function SignOutButton() {
  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
    >
      Sign Out
    </button>
  );
}
