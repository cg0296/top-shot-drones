export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import CreateLeagueForm from '@/components/create-league-form';
import DeleteLeagueButton from '@/components/delete-league-button';
import LeagueTeamManager from '@/components/league-team-manager';

export const metadata = {
  title: 'Manage Leagues — Top Shot Drones',
};

export default async function AdminLeaguesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') redirect('/dashboard');

  const [leagues, allOrgs] = await Promise.all([
    db.league.findMany({
      include: {
        memberships: {
          include: { org: { select: { id: true, name: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { memberships: true, seasons: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.organization.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="animate-fade-in">
      <h1 className="mb-8 text-2xl font-bold tracking-tight gradient-text">Manage Leagues</h1>

      {leagues.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)]">No leagues yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leagues.map((league) => {
            const memberOrgIds = new Set(league.memberships.map((m) => m.orgId));
            const available = allOrgs.filter((o) => !memberOrgIds.has(o.id));

            return (
              <div
                key={league.id}
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
              >
                {/* League header row */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--border)]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[var(--text-primary)]">{league.name}</span>
                      <span className="font-mono text-xs text-[var(--text-muted)]">{league.slug}</span>
                    </div>
                    {league.description && (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{league.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-xs text-[var(--text-muted)]">
                      {league._count.memberships} team{league._count.memberships !== 1 ? 's' : ''}
                      {' · '}
                      {league._count.seasons} season{league._count.seasons !== 1 ? 's' : ''}
                    </span>
                    <DeleteLeagueButton
                      leagueId={league.id}
                      leagueName={league.name}
                      teamCount={league._count.memberships}
                    />
                  </div>
                </div>

                {/* Team manager */}
                <div className="px-5 py-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Teams
                  </p>
                  <LeagueTeamManager
                    leagueId={league.id}
                    leagueName={league.name}
                    currentTeams={league.memberships.map((m) => m.org)}
                    availableTeams={available}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Create League</h2>
        <CreateLeagueForm />
      </div>
    </div>
  );
}
