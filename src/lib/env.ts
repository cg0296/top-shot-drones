import { z } from 'zod/v4';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  CLOUDFLARE_ACCOUNT_ID: z.string().default(''),
  CLOUDFLARE_API_TOKEN: z.string().default(''),
  CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = z.prettifyError(parsed.error);
  throw new Error(
    `Invalid environment variables:\n${formatted}\n\nPlease check your .env file.`,
  );
}

export const env = parsed.data;
