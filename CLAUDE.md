# CLAUDE.md

Read `AGENTS.md` first. If `AGENTS.md` and this file ever differ, `AGENTS.md` wins.

## Purpose

This file is the Claude Code playbook for working in `open-meet`. It does not replace `AGENTS.md`; it tells Claude how to operate safely inside the repo after reading the shared project rules.

## What This Repo Is

- `apps/web`
  - user-facing Next.js app
- `apps/admin`
  - admin console
- `apps/server`
  - NestJS + Fastify API
- `packages/*`
  - shared types, env schemas, UI, TS config, utilities

The main product areas detected in the repo are:

- auth and invite-based onboarding
- meetings and lobby flows
- meeting-scoped realtime chat/reactions/knocking
- persistent team chat
- admin RBAC, branding, configuration, users, teams, groups, meetings
- uploads/storage
- LiveKit media + recording integration

## Claude Startup Checklist

Before writing code:

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. Inspect the relevant implementation files, not just docs.
4. Check existing tests in the affected area.
5. Reuse existing patterns before proposing new abstractions.

Reach for the on-demand skills in `.claude/skills/` — they encode the repo's playbooks:

- `repo-map` — where a change goes (app/module/package by task)
- `backend-feature`, `frontend-feature`, `realtime-contracts`, `prisma-schema`, `i18n-copy` — domain playbooks
- `write-spec` — plan-first spec for multi-file features
- `validate-changes` — pick and run the narrowest checks

After non-trivial changes, get an independent pass from the `code-reviewer` subagent (`.claude/agents/code-reviewer.md`) or the built-in `/code-review`. Deeper reference docs live in `.claude/docs/` (`architecture.md`, `coding-rules.md`, `project-commands.md`).

## Required Workflow

Claude should follow this order on code tasks:

1. Understand the request in repo-specific terms.
2. Inspect the real files involved.
3. Explain the current behavior and intended change.
4. List the files likely to be edited.
5. Make a short implementation and validation plan.
6. Implement the smallest safe change.
7. Run the narrowest relevant checks.
8. Summarize what changed, what was validated, and what remains uncertain.

## Core Claude Rules

- Always inspect existing patterns before writing code.
- Never create duplicate utilities, components, hooks, services, DTOs, repositories, or packages when an equivalent already exists.
- Prefer small, safe, low-blast-radius changes that fit the current module and feature structure.
- Ask for confirmation before destructive changes such as deleting files, resetting data, modifying migrations, or changing runtime/local state.
- Reuse the existing typed API clients, shared DTOs, shared UI primitives, env parsers, and workspace packages.
- If a requested detail cannot be confirmed from the repo, write `Not detected yet` instead of inventing it.

## Where Claude Should Look First

### For user-facing web changes

- routes: `apps/web/app/[locale]`
- features: `apps/web/features/web/*`
- API wrappers: `apps/web/lib/api/*`
- providers/stores: `apps/web/providers/*`, `apps/web/stores/*`

### For admin console changes

- routes: `apps/admin/app/[locale]`
- features: `apps/admin/features/*`
- API wrappers: `apps/admin/lib/api/*`

### For backend changes

- bootstrap/global behavior: `apps/server/src/main.ts`, `apps/server/src/common/*`
- user modules: `apps/server/src/modules/client/*`
- admin modules: `apps/server/src/modules/admin/*`
- integrations: `apps/server/src/integrations/*`
- storage/uploads: `apps/server/src/storage/*`, `apps/server/src/modules/uploads/*`

### For shared-contract changes

- DTOs: `packages/types/src/dto/*`
- API envelope: `packages/types/src/api.ts`
- socket contracts: `packages/types/src/socket.ts`
- env parsing: `packages/config/src/env.ts`
- UI primitives: `packages/ui/src/*`

## Backend Rules For Claude

- Keep Nest layering intact:
  - controller -> service -> repository
- Keep Prisma queries in repositories.
- Keep controllers thin.
- Use DTO classes and existing validation patterns.
- Preserve the global response envelope from `TransformInterceptor`.
- Preserve the global error envelope from `GlobalExceptionFilter`.
- Reuse existing decorators and guards such as:
  - `@Public()`
  - `@CurrentUser()`
  - `@CurrentAdmin()`
  - `@RequirePermissions()`
- Do not inline websocket event names; use `@open-meet/types`.
- Treat admin auth and user auth as separate systems.

## Frontend Rules For Claude

- Default to Server Components.
- Add `'use client'` only when required by state, effects, browser APIs, or client hooks.
- Use TanStack Query for data fetching and mutations.
- Use `react-hook-form` + Zod for forms.
- Use the app-specific typed API clients instead of ad hoc `fetch` wrappers.
- Reuse `@open-meet/ui` primitives before adding app-level base components.
- Preserve locale-aware routing and translation behavior.
- Check whether a change affects both `apps/web` and `apps/admin` before making it one-sided.

## Shared Package Rules For Claude

- Shared DTO changes must be checked against all consuming apps/modules.
- Socket contract changes must be updated in both server gateways and frontend socket consumers.
- Env schema changes must stay aligned with `.env.example` files.
- UI primitive changes in `packages/ui` should be treated as cross-app changes.

## Realtime / Auth / Security Cautions

- Preserve cookie-based auth and origin allow-lists.
- Preserve refresh-token rotation behavior for user auth.
- Preserve admin RBAC permission checks.
- Preserve guest meeting scoping.
- Preserve upload constraints and storage-key safety.
- Preserve LiveKit token scoping and webhook verification behavior.
- Do not loosen validation just to make a change compile.

## Files Claude Should Usually Avoid Modifying

- generated/runtime output:
  - `.next/`
  - `dist/`
  - `.turbo/`
  - `coverage/`
  - `out/`
- local/runtime data:
  - `.env`
  - `.env.local`
  - `apps/server/.env`
  - `apps/web/.env.local`
  - `apps/admin/.env.local`
  - `apps/server/uploads/`
  - `.claude/projects/` (local runtime; the committed `.claude/skills`, `.claude/agents`, and `.claude/docs` are fair game)
- dependency manifests and lockfiles unless the task explicitly requires them:
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
- unrelated dirty worktree files

## Validation Expectations

After changes, run the narrowest relevant validation available.

### Workspace-level

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

### Web

- `pnpm --filter @open-meet/web lint`
- `pnpm --filter @open-meet/web typecheck`
- `pnpm --filter @open-meet/web test`
- `pnpm --filter @open-meet/web test:e2e`

### Admin

- `pnpm --filter @open-meet/admin lint`
- `pnpm --filter @open-meet/admin typecheck`
- `pnpm --filter @open-meet/admin test`
- `pnpm --filter @open-meet/admin test:e2e`

### Server

- `pnpm --filter @open-meet/server lint`
- `pnpm --filter @open-meet/server typecheck`
- `pnpm --filter @open-meet/server test`
- `pnpm --filter @open-meet/server test:e2e`

### Database / setup

- `pnpm db:reset`
- `pnpm db:wipe`
- `pnpm db:studio`
- `pnpm i18n:verify`

If a check is skipped or blocked, Claude should say so explicitly.

## Translation Rule

When adding or changing UI or API copy:

- update English first
- mirror the same key structure into every existing locale file in that namespace
- run `pnpm i18n:verify`

## When Claude Is Unsure

- inspect more files before acting
- prefer concrete repo evidence over assumptions
- write `Not detected yet` instead of filling gaps with guesses
