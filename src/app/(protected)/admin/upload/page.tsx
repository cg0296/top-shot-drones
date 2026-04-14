export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { VideoUploadForm } from '@/components/video-upload-form';

export const metadata = { title: 'Upload Video — Admin' };

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') redirect('/dashboard');

  const organizations =
    user.role === 'ADMIN'
      ? await db.organization.findMany({ orderBy: { name: 'asc' } })
      : user.organizationId
      ? await db.organization.findMany({ where: { id: user.organizationId } })
      : [];

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold tracking-tight gradient-text">Upload Video</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Upload directly to Cloudflare Stream. Select the home and away teams, season, and game to
        automatically associate the video when it finishes encoding.
      </p>
      <VideoUploadForm
        organizations={organizations.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
      />
    </div>
  );
}
