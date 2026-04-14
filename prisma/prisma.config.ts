import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

loadEnv({ path: path.resolve(__dirname, '..', '.env.local'), override: false });
loadEnv({ path: path.resolve(__dirname, '..', '.env'), override: false });

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
