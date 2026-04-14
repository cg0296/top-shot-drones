/*
  Warnings:

  - You are about to drop the column `home_away` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `opponent` on the `games` table. All the data in the column will be lost.
  - Added the required column `home_team_id` to the `games` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "games" DROP COLUMN "home_away",
DROP COLUMN "opponent",
ADD COLUMN     "away_team_id" TEXT,
ADD COLUMN     "home_team_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "games_home_team_id_idx" ON "games"("home_team_id");

-- CreateIndex
CREATE INDEX "games_away_team_id_idx" ON "games"("away_team_id");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
