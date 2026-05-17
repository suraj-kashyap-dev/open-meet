# Project — open-meet

Real-time video conferencing app (Google Meet–style). Full-stack TypeScript. Read this file in every Claude Code session before doing work in this repo.

## Stack (DO NOT swap)

**Frontend** — Next.js 15 (App Router, strict TS) · React 19 · Tailwind v4 · shadcn/ui · TanStack Query v5 · Zustand v5 · react-hook-form + zod · `motion` · lucide-react · `@livekit/components-react` v2 + `livekit-client` v2 · socket.io-client v4

**API** — Node 22 LTS · NestJS v11 with **Fastify adapter** (`@nestjs/platform-fastify`, NOT Express) · Prisma v6 · class-validator/class-transformer · `@nestjs/jwt` + `passport-jwt` · argon2 (NOT bcrypt) · `@nestjs/config` + zod env validation · BullMQ v5 · `@nestjs/websockets` + socket.io v4 · `livekit-server-sdk` v2 · `@nestjs/swagger`

**Infra** — PostgreSQL 16 · Redis 7 (ioredis) · LiveKit (Docker) · coturn (Docker) · MailHog (dev)

**Tooling** — pnpm workspaces · Turborepo v2 · ESLint v9 flat config · Prettier v3 · Vitest + Supertest (unit + API e2e) · **Playwright (browser e2e)** in `apps/e2e/` · husky + lint-staged

## Repo layout

```
apps/
  server/ NestJS monolith-modular (Fastify)
  web/    Next.js 15 App Router
  e2e/    Playwright browser tests
packages/
  types/  Shared DTOs, socket events, API envelope (@open-meet/types)
  config/ Zod env schemas (@open-meet/config)
  utils/  Pure helpers: meeting code gen, duration fmt (@open-meet/utils)
docker/   livekit.yaml, coturn.conf
```

## Non-negotiable conventions

### TypeScript

- `strict: true` everywhere, `noUncheckedIndexedAccess: true`
- No implicit `any` — use `unknown` and narrow it
- Type-only imports: `import type { … }`
- Interfaces for object shapes; type aliases only for unions / utility types
- **Enums**: real TS `enum` only in NestJS DTOs that need class-validator; in shared/frontend code use `as const` objects

### NestJS module pattern

Every module:

```
modules/<name>/
  <name>.module.ts
  <name>.controller.ts    # HTTP only (no business logic)
  <name>.service.ts       # business logic
  <name>.repository.ts    # ALL Prisma queries live here
  dto/*.dto.ts            # class-validator decorators
  guards/                 # if needed
  strategies/             # passport strategies
```

- Constructor injection only
- Controllers MUST go through services, services MUST go through repositories
- Never inject `PrismaService` into a controller or service that isn't a repository
- Every input is a DTO (no `req.body` access)
- Response shape is enforced globally by `TransformInterceptor` — controllers return raw data, not envelopes

### Response envelope (enforced globally)

Success:

```json
{ "success": true, "data": { … }, "meta": { "timestamp": "…" } }
```

Error:

```json
{ "success": false, "error": { "code": "MEETING_NOT_FOUND", "message": "…", "statusCode": 404 } }
```

Errors flow through `GlobalExceptionFilter`. Use `HttpException` subclasses, never throw raw objects.

### Auth

- argon2 for password hashing (NOT bcrypt)
- Access JWT 15m, refresh JWT 7d — both in **httpOnly cookies** (never localStorage)
- Refresh token rotation: old refresh invalidated on use, stored hashed in Redis
- `@Public()` skips `JwtAuthGuard`; `@CurrentUser()` reads `req.user`
- `@nestjs/throttler`: 5 req / 15 min per IP on `/api/auth/*`
- CORS: explicit `FRONTEND_URL` origin, NEVER wildcard

### LiveKit

- Token: `roomJoin + canPublish + canSubscribe` always; `roomAdmin` only for HOST
- TTL 4h, identity = `userId`, name = `user.name`
- Webhooks: verify `X-Livekit-Signature` header before processing

### WebSocket gateway

- Single `ChatGateway` on namespace `/meeting`
- `WsJwtGuard` runs on `handleConnection` (auth before any subscribe)
- Redis adapter (`@socket.io/redis-adapter`) so emits fan out across API instances
- Event names live in `@open-meet/types` — DON'T inline strings

### React / Next.js

- Server Components by default; `"use client"` only when needed
- Data fetching = TanStack Query (NOT `useEffect`)
- Forms = react-hook-form + zod
- Navigation = `next/navigation`
- Images = `next/image`
- All API calls go through `lib/api.ts` (typed fetch wrapper, `credentials: 'include'`)

### Security

- Validate every external input (class-validator on backend, zod on frontend forms)
- LiveKit tokens are room-scoped and short-lived (4h)
- Rate-limit `/api/auth/*` (5 / 15min / IP)
- WS connections authenticated on connect via `WsJwtGuard`

### Code style

- Prefer editing existing files over creating new ones
- No comments unless the _why_ is non-obvious
- No backwards-compat shims; if removing code, delete it
- No `useEffect` for data fetching

## Common commands

```bash
pnpm install                    # install everything
pnpm dev                        # turbo: api + web in parallel
pnpm build                      # turbo: type-check & build all packages
pnpm typecheck                  # turbo: tsc --noEmit everywhere
pnpm lint                       # turbo: eslint everywhere
pnpm format                     # prettier --write across repo

# API-specific (from apps/server or root via --filter)
pnpm --filter @open-meet/server prisma:generate
pnpm --filter @open-meet/server prisma:migrate
pnpm --filter @open-meet/server prisma:studio

# Infra
docker compose up -d            # postgres, redis, livekit, coturn, mailhog
docker compose logs -f livekit
```

## Env files

- `apps/server/.env.example` — documents every backend variable (mirrors `apiEnvSchema` in `packages/config/src/env.ts`)
- `apps/web/.env.example` — documents every `NEXT_PUBLIC_*` variable (mirrors `webPublicEnvSchema`)
- `apps/server/.env` — backend secrets (dev defaults committed for local-only)
- `apps/web/.env.local` — frontend public vars
- Add the matching `.env.example` entry FIRST whenever you introduce a new env var

## What lives where

| Concern                               | Location                           |
| ------------------------------------- | ---------------------------------- |
| Shared DTO/types                      | `packages/types/src/`              |
| Socket event names + payloads         | `packages/types/src/socket.ts`     |
| Env zod schemas                       | `packages/config/src/env.ts`       |
| API response envelope shape           | `packages/types/src/api.ts`        |
| Meeting code generation               | `packages/utils/src/code.ts`       |
| Prisma schema                         | `apps/server/prisma/schema.prisma` |
| NestJS global pipe/filter/interceptor | `apps/server/src/common/`          |
| API entry point                       | `apps/server/src/main.ts`          |
| Next.js entry                         | `apps/web/app/layout.tsx`          |
| Typed API client                      | `apps/web/lib/api.ts`              |
| Zustand stores                        | `apps/web/stores/`                 |

## Testing discipline — non-negotiable

**Every feature and every bug fix ships with tests. End-to-end.**

- **Unit tests (Vitest)** live next to source as `<name>.spec.ts`. Required for every service, repository, util, guard, pipe, and React component with non-trivial logic.
- **Browser e2e tests (Playwright)** live in `apps/e2e/tests/`. Required for every user-visible flow change: auth, create/join meeting, in-call controls, chat, reactions, host actions, end-meeting flow.
- For a **bug fix**: write a failing regression test FIRST, then fix.
- Before declaring any step or task done, both must pass:
  ```bash
  pnpm test                              # unit (all workspaces)
  pnpm --filter @open-meet/e2e test      # Playwright
  ```
- Playwright browser binaries are not auto-installed. Run once after `pnpm install`:
  ```bash
  pnpm --filter @open-meet/e2e install:browsers
  ```
- Playwright's `webServer` auto-starts `apps/web` in dev. For real LiveKit/socket flows the infra stack must be up first (`docker compose up -d`).

## Build order reference

The spec defines a strict 15-step build order. We're past STEPs 1–4 + 9 (scaffolding). Feature steps remaining: 5 (auth), 6 (meetings), 7 (livekit), 8 (ws gateway), 10 (auth pages), 11 (home+lobby), 12 (meeting room), 13 (controls), 14 (chat+reactions), 15 (host controls + polish).

Complete each step fully, run `pnpm build` from root, before moving to the next. Don't skip ahead.
