import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

const grantAccessSchema = z.object({
  videoId: z.string(),
  userId: z.string(),
  accessType: z.literal("VIEW"),
});

const revokeAccessSchema = z.object({
  videoId: z.string(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = grantAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { videoId, userId, accessType } = parsed.data;

  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (user.role === "STAFF" && !user.memberships.some((m) => m.organizationId === video.organizationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.videoAccess.upsert({
    where: { videoId_userId: { videoId, userId } },
    update: { accessType },
    create: { videoId, userId, accessType },
  });

  await logAction(
    user.id,
    "ACCESS_GRANTED",
    "VideoAccess",
    `${videoId}:${userId}`,
    { videoId, userId, accessType },
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = revokeAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { videoId, userId } = parsed.data;

  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (user.role === "STAFF" && !user.memberships.some((m) => m.organizationId === video.organizationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.videoAccess.deleteMany({
    where: { videoId, userId },
  });

  await logAction(
    user.id,
    "ACCESS_REVOKED",
    "VideoAccess",
    `${videoId}:${userId}`,
    { videoId, userId },
  );

  return NextResponse.json({ success: true });
}
