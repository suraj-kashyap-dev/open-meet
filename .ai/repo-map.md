# Repo Map

## Purpose

This file is a fast orientation map for Codex and Claude. Use it to find the right layer before editing.

## Root

- `AGENTS.md`
  - primary repo instructions for Codex and the shared project workflow
- `CLAUDE.md`
  - Claude-specific companion instructions
- `docs/`
  - human/Codex/Claude project documentation
- `.ai/`
  - AI-focused maps, patterns, decisions, and workflows
- `apps/`
  - deployable applications
- `packages/`
  - shared workspace libraries
- `docker/`
  - local infrastructure config
- `scripts/`
  - setup and i18n scripts

## Applications

### `apps/web`

- `app/[locale]/`
  - locale root layout and route tree
- `features/web/auth/`
  - user login, invite acceptance, auth guards
- `features/web/home/`
  - home/dashboard scheduling UI
- `features/web/lobby/`
  - pre-join lobby/device selection
- `features/web/meeting/`
  - active meeting UI, controls, recording, LiveKit wiring
- `features/web/chat/`
  - persistent team chat UI, socket handling, query cache logic
- `features/web/history/`
  - meeting history UI
- `features/web/account/`
  - settings, profile, localization, privacy
- `lib/api/`
  - typed browser/server API wrappers
- `providers/`
  - React Query, auth bootstrap, unauthorized handling
- `stores/`
  - global Zustand stores

### `apps/admin`

- `app/[locale]/`
  - locale root layout and admin panel route tree
- `features/accounts/`
  - admin account CRUD and invites
- `features/auth/`
  - admin login and auth guards
- `features/analytics/`
  - admin analytics screens/services
- `features/branding/`
  - workspace branding settings
- `features/configuration/`
  - workspace config settings
- `features/groups/`
  - admin-managed group conversations
- `features/meetings/`
  - admin meeting moderation
- `features/rbac/`
  - role and permission management
- `features/teams/`
  - team management
- `features/users/`
  - user CRUD, invites, avatars
- `lib/api/`
  - typed admin API wrapper

### `apps/server`

- `src/main.ts`
  - Nest bootstrap, Fastify config, global pipes/filters/interceptors, Swagger
- `src/common/`
  - decorators, filters, interceptors, pipes
- `src/database/`
  - Prisma service/module
- `src/integrations/livekit/`
  - LiveKit token issuance and webhook handling
- `src/integrations/redis/`
  - Redis integration
- `src/integrations/mail/`
  - mail integration
- `src/modules/client/`
  - user-facing API modules
- `src/modules/admin/`
  - admin-facing API modules
- `src/modules/config/`
  - public branding/config endpoints
- `src/modules/uploads/`
  - uploads and public file serving
- `src/storage/`
  - storage abstraction and local provider
- `src/websocket/`
  - redis socket adapter and meeting bus
- `prisma/schema/`
  - split Prisma schema files and migrations
- `test/unit/`
  - backend unit tests
- `test/e2e/`
  - backend e2e tests

## Shared Packages

- `packages/types`
  - shared DTOs, API envelope, websocket contracts, RBAC permission catalog
- `packages/config`
  - env schemas/parsers shared by apps
- `packages/ui`
  - reusable UI primitives
- `packages/utils`
  - reusable pure functions
- `packages/tailwind-config`
  - shared Tailwind asset export
- `packages/typescript-config`
  - shared tsconfig presets

## Where To Make Changes

### If the task is about user auth

- API: `apps/server/src/modules/client/auth/*`
- Web UI: `apps/web/features/web/auth/*`
- Shared DTOs: `packages/types/src/dto/auth.ts`

### If the task is about meetings

- API: `apps/server/src/modules/client/meetings/*`
- Web UI: `apps/web/features/web/meeting/*`, `apps/web/features/web/lobby/*`, `apps/web/features/web/home/*`
- Shared DTOs: `packages/types/src/dto/meeting.ts`

### If the task is about meeting-scoped chat/reactions/knocking

- API gateway/services: `apps/server/src/modules/client/chat/*`
- Web meeting UI: `apps/web/features/web/meeting/*`
- Shared socket contracts: `packages/types/src/socket.ts`

### If the task is about persistent team chat

- API: `apps/server/src/modules/client/messaging/*`
- Web UI: `apps/web/features/web/chat/*`
- Shared DTOs/contracts: `packages/types/src/dto/messaging.ts`, `packages/types/src/socket.ts`

### If the task is about admin RBAC

- API: `apps/server/src/modules/admin/rbac/*`
- Admin UI: `apps/admin/features/rbac/*`
- Shared permission catalog: `packages/types/src/permissions/*`

### If the task is about branding/configuration

- API: `apps/server/src/modules/config/*`, `apps/server/src/modules/admin/branding/*`, `apps/server/src/modules/admin/configuration/*`
- Web/admin SSR fetchers: `apps/web/lib/branding.ts`, `apps/admin/lib/branding.ts`
- Admin UI: `apps/admin/features/branding/*`, `apps/admin/features/configuration/*`

### If the task is about uploads/storage

- API: `apps/server/src/modules/uploads/*`
- Storage provider: `apps/server/src/storage/*`

### If the task is about shared response or contract types

- `packages/types/src/api.ts`
- `packages/types/src/dto/*`
- `packages/types/src/socket.ts`

## Usually Avoid

- generated directories: `.next/`, `dist/`, `.turbo/`, `coverage/`
- local env/runtime data: `.env*`, `apps/server/uploads/`, `.claude/`
- lockfiles/manifests unless required by the task
- unrelated dirty worktree files

## Not Detected Yet

- dedicated background worker app
- deployment Dockerfiles
- separate mobile client
