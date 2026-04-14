-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED');

-- AlterTable: make organization_id optional and add league_id for league-scoped seasons
ALTER TABLE "seasons" ADD COLUMN "league_id" TEXT,
ALTER COLUMN "organization_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_memberships" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "video_id" TEXT,
    "season_id" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "amount_cents" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leagues_slug_key" ON "leagues"("slug");

-- CreateIndex
CREATE INDEX "league_memberships_org_id_idx" ON "league_memberships"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "league_memberships_league_id_org_id_key" ON "league_memberships"("league_id", "org_id");

-- CreateIndex
CREATE INDEX "purchases_user_id_idx" ON "purchases"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_user_id_video_id_key" ON "purchases"("user_id", "video_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_user_id_season_id_key" ON "purchases"("user_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_league_id_slug_key" ON "seasons"("league_id", "slug");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
