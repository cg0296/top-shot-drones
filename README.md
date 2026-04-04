# Top Shot Drones Video Streaming Application Project Plan

## Problem

Top Shot Drones needs a secure video streaming application that lets different customers watch drone footage without exposing every video to every user.

Today, the main risk is not video delivery itself. Cloudflare can handle streaming well. The real problem is product control:

- who can log in
- which videos each user can see
- how private footage is protected
- how video uploads, playback, and sharing are managed without manual work

If this is not designed correctly at the start, the platform can become hard to scale, difficult to administer, and risky from a privacy standpoint.

## Solution

Build a web application for Top Shot Drones that uses Cloudflare for video streaming and a controlled application layer for authentication and authorization.

The application should:

- let users log in securely
- organize videos by customer, project, event, or team
- control access by user role and assigned permissions
- stream videos through Cloudflare
- give admins a simple way to upload, assign, and manage video access

The core business solution is straightforward:

1. Top Shot Drones uploads or registers videos in Cloudflare Stream.
2. Videos are stored in the app with metadata and ownership rules.
3. Users log in and only see the videos they are authorized to access.
4. Admins can grant or revoke access without changing the video files themselves.

## Product Goals

- Launch a private video portal for Top Shot Drones customers
- Make Cloudflare the streaming layer instead of building custom video infrastructure
- Restrict video access by user, organization, role, or project
- Keep the first release simple enough to ship quickly
- Create a technical base that can later support billing, analytics, and self-service uploads

## Users

- Admin: manages users, videos, permissions, and organizations
- Internal staff: uploads footage, organizes videos, and assigns access
- Customer account owner: views videos for their company or project
- Limited viewer: can only access specific assigned videos

## Scope For Version 1

### Core features

- Email and password login
- Secure session management
- User roles and permission checks
- Video library page
- Video detail page with Cloudflare playback
- Admin dashboard for managing users and video assignments
- Access control so users only see authorized videos

### Access control model

Version 1 should support all of these:

- Role-based access
- Organization-based access
- Direct video assignment

That gives enough flexibility for Top Shot Drones to support:

- one customer with many videos
- one video shared with several viewers
- internal staff with broader access
- private footage restricted to named users only

## Recommended Business Workflow

1. Admin creates an organization or customer account.
2. Admin creates users and assigns roles.
3. Internal staff uploads a video to Cloudflare Stream or registers an existing Cloudflare video ID.
4. Staff creates the video record inside the app.
5. Staff assigns access by organization, role, or individual user.
6. User logs in and sees only authorized videos.
7. User opens a video and watches it through the Cloudflare player.

## Technical Plan

## Architecture

- Frontend: Next.js application
- Backend: Next.js server routes or server actions for app logic
- Database: Postgres
- ORM: Prisma
- Authentication: app-managed auth with hashed passwords and secure sessions
- Validation: Zod
- Video streaming: Cloudflare Stream
- Hosting: Vercel or similar for the app, Cloudflare for video delivery

## Core Technical Requirements

### Authentication

- Email and password login
- Password hashing with `bcryptjs`
- Secure HTTP-only session cookie
- Password reset flow in a later phase if needed
- Route protection for authenticated pages

### Authorization

- Role-based permissions
- Organization scoping
- Per-video access overrides
- Server-side authorization checks on every protected request

### Video Management

- Store Cloudflare video ID
- Store title, description, thumbnail, status, created date, and owner
- Track which organization or users can access each video
- Support filtering by customer, event, project, or date

### Cloudflare Integration

- Upload flow handled through Cloudflare Stream API
- Store returned Cloudflare asset identifiers
- Use Cloudflare playback URLs in the app
- Use signed playback tokens for private content if required

## Proposed Data Model

### Users

- id
- name
- email
- password_hash
- role
- organization_id
- created_at
- updated_at

### Organizations

- id
- name
- slug
- created_at
- updated_at

### Videos

- id
- title
- description
- cloudflare_video_id
- thumbnail_url
- organization_id
- uploaded_by_user_id
- visibility
- created_at
- updated_at

### VideoAccess

- id
- video_id
- user_id
- access_type
- created_at

### Sessions

- id
- user_id
- token_hash
- expires_at
- created_at

## Recommended Access Rules

- Admin can access everything
- Internal staff can access videos for assigned organizations
- Customer users can access videos owned by their organization
- Restricted users can access only videos explicitly assigned to them

## Delivery Phases

### Phase 1: Foundation

- Finalize requirements
- Set up Prisma schema
- Create database
- Implement authentication
- Create protected app shell

### Phase 2: Video Library

- Build video list page
- Build video detail page
- Save Cloudflare video metadata
- Add organization filtering

### Phase 3: Access Control

- Add role model
- Add organization scoping
- Add per-video permissions
- Enforce authorization in backend routes

### Phase 4: Admin Tools

- Admin user management
- Admin video management
- Assign and revoke user access
- Audit-friendly activity logging

### Phase 5: Hardening

- Improve error handling
- Add monitoring and logging
- Add signed playback protection
- Add automated tests for auth and permissions

## Recommended File And Route Strategy

### App routes

- `/login`
- `/dashboard`
- `/videos`
- `/videos/[id]`
- `/admin/users`
- `/admin/videos`
- `/admin/organizations`

### API routes

- `/api/auth/login`
- `/api/auth/logout`
- `/api/videos`
- `/api/videos/[id]`
- `/api/admin/users`
- `/api/admin/video-access`
- `/api/cloudflare/webhooks`

## Security Requirements

- Never trust client-side access checks by themselves
- Enforce authorization on the server for every protected resource
- Hash passwords before storage
- Use secure cookies for sessions
- Validate every input with Zod
- Keep Cloudflare credentials in environment variables
- Add audit logs for sensitive admin actions

## Risks And Mitigations

### Risk: overcomplicated permissions

Solution:

- start with role + organization + direct video assignment
- avoid custom policy logic in version 1

### Risk: leaked private video links

Solution:

- keep access decisions in the app layer
- use private playback flows and signed tokens when needed

### Risk: weak admin controls

Solution:

- centralize user and video management
- log access changes
- keep admin-only routes isolated

### Risk: scope creep

Solution:

- ship login, library, playback, and access control first
- defer analytics, billing, and advanced workflows

## Development Priorities

1. Authentication
2. Authorization model
3. Cloudflare video registration and playback
4. Video library UI
5. Admin access management
6. Testing and hardening

## Suggested Build Prompt For An Agent

Copy and paste this into an agent:

```text
Build the first production-ready foundation for the Top Shot Drones video streaming application.

Business goal:
Create a secure customer video portal where users can log in and only watch videos they are authorized to access. Video streaming should use Cloudflare Stream. Admins must be able to control which users can access which videos.

Technical requirements:
- Use Next.js App Router
- Use Prisma with Postgres
- Use bcryptjs for password hashing
- Use Zod for validation
- Implement email/password login
- Implement secure session-based authentication
- Implement authorization with roles, organization scoping, and direct video assignments
- Add protected routes for dashboard and videos
- Add admin routes for managing users and video access
- Create database models for Users, Organizations, Videos, VideoAccess, and Sessions
- Store Cloudflare video IDs and render playback on video detail pages
- Enforce all access checks on the server

Deliverables:
- Prisma schema
- Initial migrations
- Auth utilities
- Login page
- Dashboard shell
- Video library page
- Video detail page
- Admin pages for users and access management
- Seed data if useful
- README updates for local setup and environment variables

Constraints:
- Keep version 1 simple and secure
- Do not add billing, analytics, or advanced media workflows yet
- Prefer clear, maintainable patterns over clever abstractions
```

## Implementation Notes For This Repository

- The current repository is still mostly a scaffold
- The product direction should follow the research in `research-hudl-competitors-and-mvp.md`
- The first technical milestone should be schema plus auth plus protected video access

## Next Recommended Step

Start by implementing the data model and authentication layer first. After that, build the protected video library and connect Cloudflare playback to authorized records only.

## Next 3 Major Milestones

### Milestone 1: Secure Application Foundation

Goal:

Establish the application base so users can log in securely and the system can reliably identify who they are.

High-level outcomes:

- Set up the database and Prisma schema
- Create users, organizations, sessions, videos, and access models
- Implement email and password authentication
- Protect private routes and admin routes
- Add basic seed data for local development

Definition of done:

- Users can log in and log out
- Protected pages require authentication
- Core data model is in place and tested locally

### Milestone 2: Private Video Library And Cloudflare Playback

Goal:

Allow authorized users to browse and watch only the videos they are supposed to access.

High-level outcomes:

- Build dashboard and video library screens
- Save Cloudflare video IDs and metadata in the app
- Create a video detail page with Cloudflare playback
- Add server-side checks so users only see allowed videos
- Support filtering by organization, project, or customer

Definition of done:

- Logged-in users can browse their allowed video list
- Users can open a video detail page and stream from Cloudflare
- Unauthorized users cannot access restricted videos

### Milestone 3: Admin Controls And Access Management

Goal:

Give Top Shot Drones a practical admin workflow to manage customers, videos, and permissions without engineering involvement.

High-level outcomes:

- Build admin pages for users, organizations, and videos
- Add tools to assign and revoke video access
- Add role management for admin, staff, customer, and restricted viewer
- Add activity logging for major admin actions
- Prepare the app for production hardening and deployment

Definition of done:

- Admins can manage users and organizations
- Admins can control which users can access which videos
- Access changes are enforced immediately and recorded
