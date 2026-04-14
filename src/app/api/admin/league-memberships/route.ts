import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const membershipSchema = z.object({
  leagueId: z.string().min(1),
  orgId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const result = membershipSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  const { leagueId, orgId } = result.data;

  const [league, org] = await Promise.all([
    db.league.findUnique({ where: { id: leagueId } }),
    db.organization.findUnique({ where: { id: orgId } }),
  ]);
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const existing = await db.leagueMembership.findUnique({
    where: { leagueId_orgId: { leagueId, orgId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Team already in league' }, { status: 409 });
  }

  const membership = await db.leagueMembership.create({ data: { leagueId, orgId } });

  await logAction(user.id, 'LEAGUE_TEAM_ADDED', 'League', leagueId, {
    leagueName: league.name,
    orgName: org.name,
  });

  return NextResponse.json(membership, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const result = membershipSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  const { leagueId, orgId } = result.data;

  const membership = await db.leagueMembership.findUnique({
    where: { leagueId_orgId: { leagueId, orgId } },
  });
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.leagueMembership.delete({ where: { leagueId_orgId: { leagueId, orgId } } });

  await logAction(user.id, 'LEAGUE_TEAM_REMOVED', 'League', leagueId, { orgId });

  return NextResponse.json({ ok: true });
}
