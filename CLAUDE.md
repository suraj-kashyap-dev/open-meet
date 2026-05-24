# Project — open-meet

Real-time video conferencing app (Google Meet–style). Full-stack TypeScript. Read this file in every Claude Code session before doing work in this repo.

## Stack (DO NOT swap)

**Frontend** — Next.js 15 (App Router, strict TS) · React 19 · Tailwind v4 · shadcn/ui · TanStack Query v5 · Zustand v5 · react-hook-form + zod · `motion` · lucide-react · `@livekit/components-react` v2 + `livekit-client` v2 · socket.io-client v4

**API** — Node 22 LTS · NestJS v11 with **Fastify adapter** (`@nestjs/platform-fastify`, NOT Express) · Prisma v6 · class-validator/class-transformer · `@nestjs/jwt` + `passport-jwt` · argon2 (NOT bcrypt) · `@nestjs/config` + zod env validation · BullMQ v5 · `@nestjs/websockets` + socket.io v4 · `livekit-server-sdk` v2 · `@nestjs/swagger`

**Infra** — PostgreSQL 16 · Redis 7 (ioredis) · LiveKit (Docker) · coturn (Docker) · MailHog (dev)

**Tooling** — pnpm workspaces · Turborepo v2 · ESLint v9 flat config · Prettier v3 · Vitest + Supertest (unit + API e2e, co-located per app) · husky + lint-staged

## Repo layout

```
apps/
  server/ NestJS monolith-modular (Fastify) — backend tests live here
  web/    Next.js 15 App Router — user-facing app (port 3000)
  admin/  Next.js 15 App Router — admin console (port 3001, separate origin)
packages/
  ui/                Shared React lib: shadcn primitives + `cn` + cross-app components (@open-meet/ui)
  types/             Shared DTOs, socket events, API envelope (@open-meet/types)
  config/            Zod env schemas (@open-meet/config)
  utils/             Pure helpers: meeting code gen, duration fmt (@open-meet/utils)
  tailwind-config/   Shared Tailwind v4 design tokens / globals (@open-meet/tailwind-config)
  typescript-config/ Shared tsconfig bases: base / nextjs / react-library (@open-meet/typescript-config)
docker/   livekit.yaml, coturn.conf
```

**Admin vs user are separate apps, end to end.** Backend: `modules/admin/*` vs `modules/client/*` (own JWT strategies/guards, `/api/admin/*` endpoints). Frontend: `apps/web` (user) and `apps/admin` (console) are independent Next.js apps on separate origins; the API allow-lists both via `FRONTEND_URL` + `ADMIN_URL`. Shared UI lives in `@open-meet/ui` (consumed by both via `transpilePackages`), never duplicated per app.

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
- Access JWT 7d, refresh JWT 7d — both in **httpOnly cookies** (never localStorage)
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
- Navigation = locale-aware `Link`/`useRouter`/`usePathname`/`redirect` from `@/i18n/navigation`; `useSearchParams`/`useParams` still come from `next/navigation`
- Images = `next/image`
- All API calls go through `lib/api.ts` (typed fetch wrapper, `credentials: 'include'`)

### Internationalization (i18n)

The whole app is localized. **English (`en`) is the source of truth; Arabic (`ar`) is the second locale (RTL).**

- **Frontend** (`apps/web`, `apps/admin`): `next-intl` v4 with URL-prefixed routing (`/[locale]/…`). Locale config in `apps/{web,admin}/i18n/` (`routing.ts`, `request.ts`, `navigation.ts`) + `middleware.ts`. Read strings with `useTranslations('<namespace>')` (client) or `getTranslations('<namespace>')` (server). Authenticated/panel routes are `force-dynamic`; statically rendered pages call `setRequestLocale(locale)`. RTL `dir` is set on `<html>` by the locale layout.
- **Backend** (`apps/server`): `nestjs-i18n`. Request locale resolves from the `x-locale` header (the typed api client sends the active locale), then `?lang=`, then `Accept-Language`. Localize via `I18nContext.current()` or the injected `I18nService`.
- **Message files**: one per namespace under `<app>/lang/<locale>/<namespace>.json` (Laravel/Filament-style directory layout) — `apps/web/lang/`, `apps/admin/lang/`, `apps/server/lang/`. **Keys are kebab-case.** Values use ICU MessageFormat (`{name}`, plurals).

**Rule — keep locales in lockstep:** whenever you add, rename, or remove a translation key, do it in **English first**, then mirror the exact same change into **every** other locale. Each locale must contain the same namespace files with identical keys, nesting, and key order — only the values differ. Run `pnpm i18n:verify` before committing; CI (`.github/workflows/i18n.yml`) enforces it.

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
pnpm i18n:verify                # every locale must mirror the English base (files, keys, nesting, order)

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

| Concern                               | Location                                 |
| ------------------------------------- | ---------------------------------------- |
| Shared DTO/types                      | `packages/types/src/`                    |
| Socket event names + payloads         | `packages/types/src/socket.ts`           |
| Env zod schemas                       | `packages/config/src/env.ts`             |
| API response envelope shape           | `packages/types/src/api.ts`              |
| Meeting code generation               | `packages/utils/src/code.ts`             |
| Prisma schema (multi-file by domain)  | `apps/server/prisma/schema/*.prisma`     |
| NestJS global pipe/filter/interceptor | `apps/server/src/common/`                |
| API entry point + CORS allow-list     | `apps/server/src/main.ts`                |
| Shared UI components (`cn`, shadcn)   | `packages/ui/src/`                       |
| User app entry                        | `apps/web/app/[locale]/layout.tsx`       |
| Admin app entry                       | `apps/admin/app/[locale]/layout.tsx`     |
| Typed API client (per app)            | `apps/{web,admin}/lib/api/client.ts`     |
| Zustand stores                        | `apps/web/stores/`                       |
| Translations (en base + ar)           | `apps/{web,admin,server}/lang/<locale>/` |
| i18n config (frontend)                | `apps/{web,admin}/i18n/`                 |

## Testing discipline — non-negotiable

**Every feature and every bug fix ships with tests. End-to-end.**

- **Test files live under a per-package `test/` tree, NOT next to source.** Unit specs go in `test/unit/**` mirroring the `src/` path (e.g. `src/modules/client/auth/auth.service.ts` → `test/unit/modules/client/auth/auth.service.spec.ts`). Import the unit under test via the `@/` alias (`@/modules/client/auth/auth.service`), so specs are independent of source moves. In `packages/*`, specs go in `test/` and import via `../src/<name>`.
- **Unit tests (Vitest)** are required for every service, repository, util, guard, pipe, interceptor, gateway, and (on the web side) component with non-trivial logic.
- **Name tests as behavioral specs.** Group cases by the method under test with a nested `describe('methodName()')`, and phrase every case as `it('should … [when …]')`. Descriptions state observable behavior, not implementation.
- **API e2e tests (Vitest + Supertest)** live in `apps/server/test/e2e/`. They boot the Nest Fastify app against a throwaway Postgres/Redis and exercise HTTP flows: auth, meetings, uploads, recording, admin auth, and the response envelope.
- For a **bug fix**: write a failing regression test FIRST, then fix.
- Before declaring any step or task done:
  ```bash
  pnpm --filter @open-meet/server test       # unit
  pnpm --filter @open-meet/server test:e2e   # API e2e (needs test Postgres/Redis)
  ```

## Build order reference

The spec defines a strict 15-step build order. We're past STEPs 1–4 + 9 (scaffolding). Feature steps remaining: 5 (auth), 6 (meetings), 7 (livekit), 8 (ws gateway), 10 (auth pages), 11 (home+lobby), 12 (meeting room), 13 (controls), 14 (chat+reactions), 15 (host controls + polish).

Complete each step fully, run `pnpm build` from root, before moving to the next. Don't skip ahead.
