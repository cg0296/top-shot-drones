# Top Shot Drones

Private video streaming platform for drone sports videography. Customers log in and watch only the videos they are authorized to access, streamed through Cloudflare Stream.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Clerk
- **Database:** PostgreSQL with Prisma ORM
- **Video:** Cloudflare Stream
- **Validation:** Zod
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Clerk account
- Cloudflare Stream account (for video features)

### Environment Variables

Copy `.env.local.example` to `.env.local` (or create `.env.local`) and set:

```
DATABASE_URL=postgresql://...
SESSION_SECRET=<at least 32 characters>

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudflare Stream (optional for initial setup)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=
```

### Install and Run

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### Seed Data

```bash
npx prisma db seed
```

## Project Structure

```
src/
  app/
    (protected)/         # Auth-required routes
      admin/
        audit/           # Admin audit log
        organizations/   # Manage organizations
        users/           # Manage users
        videos/          # Manage videos + detail view
      dashboard/         # User dashboard
      videos/            # Video library + detail view
    api/
      admin/             # Admin API routes
      auth/              # Login/logout
      videos/            # Video CRUD, comments, reactions
    login/               # Legacy login page
    sign-in/             # Clerk sign-in
    sign-up/             # Clerk sign-up
  components/            # Shared UI components
  lib/
    auth.ts              # Auth utilities
    auth-helpers.ts      # Session helpers
    clerk-helpers.ts     # Clerk integration helpers
    audit.ts             # Audit logging
    cloudflare.ts        # Cloudflare Stream API
    db.ts                # Prisma client
    env.ts               # Env validation (Zod)
prisma/
  schema.prisma          # Data model
  seed.ts                # Seed script
  migrations/            # Database migrations
```

## Data Model

- **Users** — name, email, role (ADMIN/STAFF/CUSTOMER/VIEWER), organization
- **Organizations** — customer accounts with unique slugs
- **Videos** — Cloudflare Stream video metadata, visibility (PUBLIC/ORG/PRIVATE)
- **VideoAccess** — per-user video permission grants
- **Comments** — video comments
- **Reactions** — emoji reactions on videos
- **AuditLog** — tracks admin actions
- **Sessions** — auth session tokens

## Access Control

- **Admin** — full access to everything
- **Staff** — access videos for assigned organizations
- **Customer** — access videos owned by their organization
- **Viewer** — access only explicitly assigned videos

## Key Features

- Clerk-based authentication with sign-in/sign-up flows
- Role and organization-based video access control
- Cloudflare Stream integration for video playback
- Admin dashboard for managing users, orgs, and video permissions
- Video comments and reactions
- Audit logging for admin actions
- Cloudflare video sync from admin panel
