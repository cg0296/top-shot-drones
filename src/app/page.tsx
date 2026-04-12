import Link from 'next/link';
import Image from 'next/image';
import { Show, SignInButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(229,25,62,0.08)_0%,_transparent_70%)]" />

      <div className="animate-fade-in-up relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        <div className="rounded-2xl bg-white/90 p-4">
          <Image
            src="/tsd-logo.png"
            alt="Top Shot Drones"
            width={120}
            height={120}
            priority
          />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl gradient-text">
            Top Shot Drones
          </h1>
          <p className="mt-3 text-lg text-[var(--text-secondary)]">
            Premium drone sports videography streaming
          </p>
        </div>

        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="btn-accent rounded-full px-8 py-3 text-sm font-semibold tracking-wide uppercase">
              Sign In
            </button>
          </SignInButton>
        </Show>

        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="btn-accent rounded-full px-8 py-3 text-sm font-semibold tracking-wide uppercase"
          >
            Go to Dashboard
          </Link>
        </Show>
      </div>
    </div>
  );
}
