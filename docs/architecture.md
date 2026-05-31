# Architecture

## High-Level Architecture

Open Meet is a three-app monorepo:

- `apps/web`: the user-facing meeting and team chat application
- `apps/admin`: the admin console for branding, configuration, users, groups, teams, meetings, and RBAC
- `apps/server`: the NestJS API that owns auth, business logic, persistence, file serving, and websocket orchestration

External runtime services detected in this repo:

- PostgreSQL via Prisma
- Redis for auth/realtime support
- LiveKit for media rooms and recording webhooks/egress
- Local filesystem storage for uploads and generated recording files
- MailHog for local mail capture
- coturn for TURN/STUN infrastructure

## Apps, Services, And Packages

### Applications

- `apps/web`
  - Next.js `15` App Router
  - localized routes under `app/[locale]`
  - meeting, lobby, account, history, and persistent chat features
- `apps/admin`
  - Next.js `15` App Router
  - localized routes under `app/[locale]`
  - admin panel features for accounts, analytics, branding, configuration, groups, meetings, RBAC, teams, and users
- `apps/server`
  - NestJS `11` with Fastify
  - global `/api` prefix
  - client modules, admin modules, config/public branding, uploads, integrations, storage

### Shared Packages

- `packages/types`
  - shared DTOs
  - shared API response envelope types
  - Socket.IO event names/payloads
  - admin RBAC permission keys
- `packages/config`
  - zod env schemas and parsers
- `packages/ui`
  - shared React/Tailwind UI primitives
- `packages/utils`
  - shared pure helpers
- `packages/tailwind-config`
  - shared Tailwind assets
- `packages/typescript-config`
  - shared tsconfig presets

## Backend Structure

### Entry And Global Behavior

- `apps/server/src/main.ts`
  - boots Fastify
  - registers cookie and multipart plugins
  - sets the global `/api` prefix
  - enables CORS for configured web/admin origins
  - installs global `ValidationPipe`
  - installs `GlobalExceptionFilter`
  - installs `TransformInterceptor`
  - registers the Redis-backed Socket.IO adapter
  - exposes Swagger in non-production

### Module Layout

- `src/common`
  - decorators, filters, interceptors, pipes
- `src/database`
  - Prisma service/module
- `src/integrations`
  - `livekit`, `mail`, `redis`
- `src/modules/client`
  - `auth`, `chat`, `meetings`, `messaging`, `recording`, `settings`
- `src/modules/admin`
  - `accounts`, `analytics`, `auth`, `branding`, `configuration`, `groups`, `meetings`, `rbac`, `teams`, `users`
- `src/modules/config`
  - public branding/config endpoints
- `src/modules/uploads`
  - authenticated uploads plus public file serving
- `src/storage`
  - storage abstraction with a detected local filesystem provider
- `prisma/schema`
  - domain-split Prisma schema files and migrations

## Frontend Structure

### `apps/web`

- route tree under `app/[locale]`
- route groups such as `(client)`, `(auth)`, `(authenticated)`, `(shell)`, `(account)`
- feature-centric code under `features/web/*`
  - `auth`
  - `home`
  - `lobby`
  - `meeting`
  - `chat`
  - `history`
  - `account`
- shared wiring under:
  - `lib/`
  - `providers/`
  - `components/`
  - `stores/`

### `apps/admin`

- route tree under `app/[locale]`
- route groups `(auth)` and `(panel)`
- feature-centric code under `features/*`
  - `accounts`
  - `analytics`
  - `auth`
  - `branding`
  - `configuration`
  - `dashboard`
  - `groups`
  - `meetings`
  - `profile`
  - `rbac`
  - `teams`
  - `users`
- shared wiring under:
  - `lib/`
  - `providers/`
  - `components/`

## Data Flow

1. The web or admin app calls a typed fetch wrapper in `lib/api/client.ts`.
2. Requests go to the Nest API under `/api/*`.
3. Controllers delegate to services.
4. Services delegate database operations to repositories.
5. Prisma reads/writes PostgreSQL.
6. Successful JSON responses are wrapped into the shared `{ success, data, meta }` envelope.
7. Client code consumes typed DTOs from `@open-meet/types`.
8. Public branding/config is fetched server-side by both Next apps from `/api/config/public`.

## Auth Flow

### User Auth

Detected routes and behaviors:

- invite lookup and invite acceptance
- email/password login
- refresh token rotation
- logout
- `me` lookup and profile/password/avatar updates
- Google OAuth start/callback

Detected mechanics:

- login sets `access_token` and `refresh_token` httpOnly cookies
- refresh tokens are stored hashed in Redis and rotated on refresh
- the API applies a global JWT auth guard; public routes opt out with `@Public()`
- the web app keeps current-user state in TanStack Query and primes it from localStorage after hydration

### Guest Meeting Access

Detected flow:

- the web app can request `/api/meetings/:code/guest-session`
- meeting and LiveKit requests can then use a scoped Bearer token
- guest meeting scope is enforced server-side

### Admin Auth

Detected routes and behaviors:

- admin login/logout
- admin `me`
- admin profile/password/avatar updates

Detected mechanics:

- admin auth is separate from user auth
- admin auth sets a separate admin access cookie
- a refresh-token flow for admins was not detected
- RBAC is enforced through admin roles, permission resolution, and permission guards

### Signup / Onboarding

- Invite-based onboarding is clearly detected for users and admins.
- Public self-service registration is not detected in the active controller routes.
- Google OAuth is detected for users, but automatic creation of brand-new user accounts from Google alone is not detected.

## Realtime / WebSocket / LiveKit Flow

### Meeting Runtime

1. The web app fetches meeting metadata and join state through `/api/meetings/*`.
2. The web app opens a Socket.IO connection to the `/meeting` namespace.
3. The server authenticates the socket with the same JWT secret used for user/guest meeting access.
4. Clients emit join/leave/knock/chat/reaction/hand events using names from `@open-meet/types`.
5. The server persists room state through meeting/chat services and broadcasts events back to room members.
6. Redis-backed Socket.IO support allows multi-instance fan-out.

### Persistent Team Chat

1. The web app opens a second Socket.IO connection to `/chat`.
2. On connect, the server joins the user to a per-user room plus all conversation rooms.
3. Message, reaction, typing, read receipt, presence, poll, and pin updates flow through chat services and query-cache updates.
4. Presence is coordinated through Redis-backed services and conversation broadcasts.

### LiveKit

1. The web app requests `/api/livekit/token`.
2. The server mints a room-scoped LiveKit token with `livekit-server-sdk`.
3. Hosts receive extra room admin grants.
4. LiveKit webhooks are verified before room or egress events are processed.
5. Recording lifecycle updates are handled from LiveKit egress webhook events.

## Environment Variables Overview

### Backend (`apps/server/.env`)

Detected categories:

- runtime: `NODE_ENV`, `PORT`
- persistence: `DATABASE_URL`, `REDIS_URL`
- user auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- admin auth: `ADMIN_JWT_ACCESS_SECRET`, `ADMIN_JWT_ACCESS_EXPIRY`
- chat/upload/config: `USER_INVITE_TTL_HOURS`, `CHAT_MESSAGE_MAX_LENGTH`, `TENOR_API_KEY`, `UPLOAD_MAX_SIZE_BYTES`
- storage/public URLs: `LOCAL_STORAGE_DIR`, `API_PUBLIC_URL`
- LiveKit/recording: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_HOST`, `LIVEKIT_PUBLIC_URL`, `RECORDING_*`
- frontend origins: `FRONTEND_URL`, `ADMIN_URL`
- OAuth: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`
- mail: `SMTP_*`, `MAIL_FROM`
- bootstrap admin: `DEFAULT_ADMIN_*`

### Web Public Env (`apps/web/.env.local`)

- `APP_DEBUG`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`

### Admin Public Env (`apps/admin/.env.local`)

- `APP_DEBUG`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WEB_URL`

### Root `.env`

- Used by Docker Compose for LiveKit credential interpolation.
- Secret values should not be copied into documentation.

## Not Detected Yet

- Queue workers or BullMQ processors in `apps/server/src`
- Dockerfiles for app deployment
- A dedicated Prisma seed command/script
