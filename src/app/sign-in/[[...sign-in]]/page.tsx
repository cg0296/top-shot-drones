import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(229,25,62,0.06)_0%,_transparent_50%)]" />
      <div className="animate-fade-in-up flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="mx-auto mb-5 inline-block rounded-2xl bg-white/90 p-3">
            <img src="/tsd-logo.png" alt="Top Shot Drones" className="h-20 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text">Top Shot Drones</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">Sign in to your account</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
