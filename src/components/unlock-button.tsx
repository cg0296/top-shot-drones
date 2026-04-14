'use client';

export default function UnlockButton({ label = 'Unlock' }: { label?: string }) {
  function handleClick() {
    alert('Purchasing coming soon! Contact your admin for access.');
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h16.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
      {label}
    </button>
  );
}
