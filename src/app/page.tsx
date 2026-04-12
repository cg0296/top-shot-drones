import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(229,25,62,0.08)_0%,_transparent_70%)]" />

      <div className="animate-fade-in-up relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        <Image
          src="/tsd-logo.png"
          alt="Top Shot Drones"
          width={120}
          height={120}
          priority
        />
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl gradient-text">
            Top Shot Drones
          </h1>
          <p className="mt-3 text-lg text-[var(--text-secondary)]">
            Premium drone sports videography streaming
          </p>
        </div>
        <Link
          href="/login"
          className="btn-accent rounded-full px-8 py-3 text-sm font-semibold tracking-wide uppercase"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
