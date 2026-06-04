# AGENTS.md

## Project Overview

Open Meet is a pnpm workspace + Turborepo monorepo for a self-hostable collaboration product with three main surfaces:

- `apps/web`: user-facing Next.js app
- `apps/admin`: admin console
- `apps/server`: NestJS API using the Fastify adapter

The product combines video meetings, meeting-scoped chat, persistent team chat, admin/RBAC features, branding/configuration, file uploads, and LiveKit-based realtime media. If a detail is unclear, write `Not detected yet` instead of guessing.

## Tech Stack Detected From This Repo

- Workspace/tooling: pnpm `10.16.0`, Turborepo `2.x`, TypeScript `6.x`, ESLint `9`, Prettier `3`
- Frontend: Next.js `15.1.6`, React `19`, Tailwind CSS `4`, `next-intl`, TanStack Query `5`, Zustand `5`, `react-hook-form`, Zod
- UI: shared `@open-meet/ui` package with Radix-based/shadcn-style primitives and Tailwind utilities
- Backend: NestJS `11`, Fastify, Prisma `6`, PostgreSQL, Redis, Socket.IO, LiveKit, argon2, `class-validator`, Swagger
- Testing: Vitest, Supertest, Playwright
- Infra: `docker-compose.yml` for PostgreSQL, Redis, LiveKit, LiveKit Egress, coturn, and MailHog

## Monorepo Structure

```text
apps/
  admin/   Next.js admin console
  server/  NestJS API
  web/     Next.js user app
packages/
  config/            zod env schemas/parsers
  tailwind-config/   shared Tailwind assets
  types/             shared DTOs, API envelope, socket contracts, RBAC keys
  typescript-config/ shared tsconfig presets
  ui/                shared React UI primitives
  utils/             shared pure utilities
docker/              LiveKit/coturn/egress config
scripts/             setup and i18n scripts
```

## Important Commands

- Install/bootstrap:
  - `pnpm install`
  - `./setup.sh`
  - `pnpm setup`
- Development:
  - `pnpm dev`
  - `pnpm --filter @open-meet/web dev`
  - `pnpm --filter @open-meet/admin dev`
  - `pnpm --filter @open-meet/server dev`
- Build:
  - `pnpm build`
  - `pnpm --filter @open-meet/web build`
  - `pnpm --filter @open-meet/admin build`
  - `pnpm --filter @open-meet/server build`
- Lint/typecheck/format:
  - `pnpm lint`
  - `pnpm lint:fix`
  - `pnpm typecheck`
  - `pnpm format`
  - `pnpm format:check`
  - `pnpm i18n:verify`
- Test:
  - `pnpm test`
  - `pnpm --filter @open-meet/server test`
  - `pnpm --filter @open-meet/server test:e2e`
  - `pnpm --filter @open-meet/web test`
  - `pnpm --filter @open-meet/web test:e2e`
  - `pnpm --filter @open-meet/admin test`
  - `pnpm --filter @open-meet/admin test:e2e`
- Database:
  - `pnpm db:reset`
  - `pnpm db:wipe`
  - `pnpm db:studio`
  - `pnpm --filter @open-meet/server prisma:generate`
  - `pnpm --filter @open-meet/server prisma:migrate`
  - `pnpm --filter @open-meet/server prisma:studio`
- Docker/infrastructure:
  - `docker compose up -d`
  - `docker compose down`
  - `docker compose ps`
  - `docker compose logs -f`

## Coding Standards

- Follow the existing TypeScript strictness; do not weaken types to `any`.
- Prefer `import type` for type-only imports unless Nest runtime metadata requires a value import.
- Match existing formatting: single quotes, semicolons, trailing commas, 100-column wrap.
- Reuse existing shared DTOs, UI components, utilities, hooks, and service patterns before adding new ones.
- Keep changes small and local. Extend current modules/features before creating new top-level structures.
- Preserve existing i18n, auth, RBAC, and realtime patterns.

## Folder Conventions

- Next route trees live under `apps/web/app/[locale]` and `apps/admin/app/[locale]`.
- Route groups such as `(auth)`, `(panel)`, `(authenticated)`, `(shell)`, and `(client)` organize code without changing URL segments.
- Feature code in the web app lives mostly under `apps/web/features/web/*`.
- Feature code in the admin app lives mostly under `apps/admin/features/*`.
- Shared app wiring lives in `lib/`, `providers/`, `components/`, and `stores/`.
- Server features live under `apps/server/src/modules/client/*` and `apps/server/src/modules/admin/*`.
- Cross-cutting backend code lives in `apps/server/src/common/*`.
- Prisma schema is split across `apps/server/prisma/schema/*.prisma`.
- Tests live under `test/unit` and `test/e2e` trees instead of beside source files.
- Locale files live under `apps/{web,admin,server}/lang/<locale>/`.

## API / Backend Conventions

- The API uses NestJS with the Fastify adapter and a global `/api` prefix.
- Success JSON responses are wrapped by `TransformInterceptor` into the shared API envelope.
- Errors are normalized by `GlobalExceptionFilter`.
- Keep controllers thin, services focused on business logic, and repositories responsible for Prisma queries.
- Use DTO classes with `class-validator` for HTTP input validation.
- Use existing decorators/guards such as `@Public()`, `@CurrentUser()`, `@CurrentAdmin()`, and `@RequirePermissions()`.
- Admin and user auth flows are separate; admin endpoints live under `/api/admin/*`.
- Socket event names and payloads belong in `@open-meet/types`, not inline strings.

## Frontend Conventions

- Both Next apps use the App Router and locale-prefixed routes via `next-intl`.
- Default to Server Components. Add `'use client'` only when browser APIs, local state, effects, or client hooks are required.
- Use the per-app typed API clients in `apps/{web,admin}/lib/api/client.ts`.
- Use TanStack Query for data fetching and mutations.
- Use `react-hook-form` + Zod for interactive forms.
- Reuse `@open-meet/ui` primitives before creating app-specific base components.
- Use the `@/` alias inside apps and `@open-meet/*` imports for workspace packages.
- Preserve existing branding, theme, and locale wiring from the app layouts and providers.

## Database Conventions

- PostgreSQL is accessed through Prisma.
- Schema files are organized by domain: users/settings, meetings, meeting chat, persistent messaging, admins/workspace settings, RBAC, recordings.
- Prisma migrations live under `apps/server/prisma/schema/migrations`.
- Keep Prisma calls inside repository classes.
- Treat uploads/storage as part of backend state: current provider is local filesystem storage under `apps/server/uploads`.

## Testing Rules

- Put new tests in the existing `test/unit` or `test/e2e` trees.
- Backend changes should usually include Vitest coverage; add e2e coverage when HTTP or websocket contracts change.
- Frontend changes should usually include Vitest coverage; add Playwright coverage for important user flows.
- Prefer the narrowest relevant commands first, then broader workspace commands if the change is cross-cutting.
- If a command cannot be run, say so explicitly.

## Security Rules

- Never commit secrets or replace example env values with live credentials.
- Preserve cookie-based auth behavior and existing origin allow-lists.
- Keep admin RBAC/permission checks intact.
- Validate all external input on both server and client layers.
- Respect existing upload limits and storage-key safety checks.
- Preserve LiveKit room scoping, short-lived token issuance, and webhook signature verification.
- SVG logo upload support is not detected; current branding uploads accept raster image formats only.

## Files And Folders Agents Should Avoid Modifying

- Generated/runtime output:
  - `.next/`
  - `dist/`
  - `coverage/`
  - `.turbo/`
  - `out/`
- Dependencies/vendor:
  - `node_modules/`
- Local/runtime data:
  - `.env`
  - `.env.local`
  - `apps/server/.env`
  - `apps/web/.env.local`
  - `apps/admin/.env.local`
  - `apps/server/uploads/`
  - `.claude/projects/` (local runtime — but `.claude/skills`, `.claude/agents`, and `.claude/docs` are shared config and fair to edit)
- Dependency manifests and lockfiles unless the task explicitly requires them:
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
- Prisma migrations unless the task explicitly includes schema/database work
- Unrelated user changes already present in the worktree

## Required Workflow Before Coding

1. Read `AGENTS.md`.
2. Inspect the relevant files, routes, modules, tests, and configs.
3. Explain your understanding of the requested change.
4. List the files you expect to touch.
5. Make a short implementation and validation plan.
6. Then implement.

## Related Documentation

- `CLAUDE.md`
- `.claude/docs/architecture.md`
- `.claude/docs/coding-rules.md`
- `.claude/docs/project-commands.md`
- `.claude/skills/*` — on-demand playbooks (repo-map, backend/frontend feature, realtime contracts, prisma, i18n, write-spec, validate-changes)
- `.claude/agents/code-reviewer.md` — fresh-context, stack-aware reviewer subagent
