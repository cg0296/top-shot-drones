-- Drop legacy single-org column from users (memberships replace it)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_organization_id_fkey";
ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id";
