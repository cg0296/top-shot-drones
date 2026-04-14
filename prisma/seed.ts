import { hash } from 'bcryptjs';
import { db } from '../src/lib/db';

async function main() {
  const passwordHash = await hash('password123', 12);

  // --- Organizations ---
  const topShot = await db.organization.upsert({
    where: { id: 'org-topshot' },
    update: {},
    create: {
      id: 'org-topshot',
      name: 'Top Shot Drones',
      slug: 'top-shot-drones',
    },
  });

  const acme = await db.organization.upsert({
    where: { id: 'org-acme' },
    update: {},
    create: {
      id: 'org-acme',
      name: 'Acme Corp',
      slug: 'acme-corp',
    },
  });

  // --- Users ---
  const admin = await db.user.upsert({
    where: { id: 'user-admin' },
    update: {},
    create: {
      id: 'user-admin',
      name: 'Admin User',
      email: 'admin@topshot.dev',
      passwordHash,
      role: 'ADMIN',
      memberships: { create: { organizationId: topShot.id, role: 'ADMIN', isDefault: true } },
    },
  });

  await db.user.upsert({
    where: { id: 'user-staff' },
    update: {},
    create: {
      id: 'user-staff',
      name: 'Staff User',
      email: 'staff@topshot.dev',
      passwordHash,
      role: 'STAFF',
      memberships: { create: { organizationId: topShot.id, role: 'STAFF', isDefault: true } },
    },
  });

  await db.user.upsert({
    where: { id: 'user-customer' },
    update: {},
    create: {
      id: 'user-customer',
      name: 'Acme Corp',
      email: 'customer@acme.dev',
      passwordHash,
      role: 'CUSTOMER',
      memberships: { create: { organizationId: acme.id, role: 'CUSTOMER', isDefault: true } },
    },
  });

  const viewer = await db.user.upsert({
    where: { id: 'user-viewer' },
    update: {},
    create: {
      id: 'user-viewer',
      name: 'Viewer Only',
      email: 'viewer@acme.dev',
      passwordHash,
      role: 'VIEWER',
      memberships: { create: { organizationId: acme.id, role: 'VIEWER', isDefault: true } },
    },
  });

  // --- Videos ---
  const video1 = await db.video.upsert({
    where: { id: 'video-001' },
    update: {},
    create: {
      id: 'video-001',
      title: 'Drone Highlights Reel',
      description: 'Best shots from the 2026 season',
      cloudflareVideoId: 'cf-video-001',
      organizationId: topShot.id,
      uploadedByUserId: admin.id,
      visibility: 'ORG',
    },
  });

  await db.video.upsert({
    where: { id: 'video-002' },
    update: {},
    create: {
      id: 'video-002',
      title: 'Behind the Scenes',
      description: 'How we capture aerial footage',
      cloudflareVideoId: 'cf-video-002',
      organizationId: topShot.id,
      uploadedByUserId: admin.id,
      visibility: 'ORG',
    },
  });

  // --- Video Access ---
  await db.videoAccess.upsert({
    where: {
      videoId_userId: {
        videoId: video1.id,
        userId: viewer.id,
      },
    },
    update: {},
    create: {
      id: 'access-viewer-video1',
      videoId: video1.id,
      userId: viewer.id,
      accessType: 'VIEW',
    },
  });

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
