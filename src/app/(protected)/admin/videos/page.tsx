export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { RegisterVideoForm } from '@/components/register-video-form';

export const metadata = {
  title: 'Manage Videos — Top Shot Drones',
};

export default async function AdminVideosPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') redirect('/dashboard');

  const isAdmin = user.role === 'ADMIN';

  const videos = await db.video.findMany({
    where: isAdmin ? {} : { organizationId: user.organizationId! },
    include: { organization: true, uploadedBy: true },
    orderBy: { createdAt: 'desc' },
  });

  const organizations = isAdmin
    ? await db.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : user.organizationId
      ? await db.organization.findMany({
          where: { id: user.organizationId },
          select: { id: true, name: true },
        })
      : [];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">
        Manage Videos
      </h1>

      {/* Videos table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">Title</th>
              <th className="px-4 py-3 font-medium text-slate-600">Organization</th>
              <th className="px-4 py-3 font-medium text-slate-600">Visibility</th>
              <th className="px-4 py-3 font-medium text-slate-600">CF Video ID</th>
              <th className="px-4 py-3 font-medium text-slate-600">Uploaded By</th>
              <th className="px-4 py-3 font-medium text-slate-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {videos.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No videos registered yet
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr key={video.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {video.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {video.organization.name}
                  </td>
                  <td className="px-4 py-3">
                    <VisibilityBadge visibility={video.visibility} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {video.cloudflareVideoId.length > 12
                      ? `${video.cloudflareVideoId.slice(0, 12)}...`
                      : video.cloudflareVideoId}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {video.uploadedBy.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(video.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Register video form */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Register a Video
        </h2>
        <RegisterVideoForm
          organizations={organizations}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const styles: Record<string, string> = {
    PUBLIC: 'bg-green-100 text-green-700',
    ORG: 'bg-blue-100 text-blue-700',
    PRIVATE: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[visibility] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {visibility}
    </span>
  );
}
