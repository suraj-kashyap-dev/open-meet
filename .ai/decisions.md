# Decisions

This file records long-term decisions already visible in the current codebase. Update it when architecture or conventions materially change.

## Detected Decisions

- The repo is organized as a pnpm workspace + Turborepo monorepo with `apps/*` and `packages/*`.
  - Evidence: `package.json`, `pnpm-workspace.yaml`, `turbo.json`

- The product is split into three application surfaces: user web app, admin console, and NestJS API.
  - Evidence: `apps/web`, `apps/admin`, `apps/server`

- Shared contracts live in `@open-meet/types`.
  - Evidence: the server and both Next apps import DTOs, API envelope types, socket events, and RBAC keys from `packages/types`

- The API uses NestJS with the Fastify adapter, a global `/api` prefix, a global validation pipe, a global response wrapper, and a global exception filter.
  - Evidence: `apps/server/src/main.ts`, `apps/server/src/common/*`

- User auth uses httpOnly access + refresh cookies with Redis-backed refresh rotation.
  - Evidence: `apps/server/src/modules/client/auth/auth.controller.ts`, `apps/server/src/modules/client/auth/auth.service.ts`

- Admin auth is separate from user auth and currently uses a short-lived admin access cookie without a detected refresh flow.
  - Evidence: `apps/server/src/modules/admin/auth/auth.controller.ts`, `apps/server/src/modules/admin/auth/*`

- Prisma schema is split by domain instead of kept in a single large schema file.
  - Evidence: `apps/server/prisma/schema/*.prisma`

- Media transport is delegated to LiveKit, while application realtime uses Socket.IO namespaces for meeting orchestration and persistent chat.
  - Evidence: `packages/types/src/socket.ts`, `apps/server/src/modules/client/chat/chat.gateway.ts`, `apps/server/src/modules/client/messaging/conversation.gateway.ts`, `apps/server/src/integrations/livekit/*`

- Realtime Socket.IO traffic is designed for multi-instance fan-out through Redis adapters/buses.
  - Evidence: `apps/server/src/websocket/redis-io.adapter.ts`, `apps/server/src/websocket/meeting-bus.service.ts`, `apps/server/src/modules/client/messaging/chat-bus.service.ts`

- Current storage is local filesystem-backed, with uploads served back through API routes.
  - Evidence: `apps/server/src/storage/*`, `apps/server/src/modules/uploads/uploads.controller.ts`

- Public branding/config is centralized in the API and fetched server-side by both Next apps.
  - Evidence: `apps/server/src/modules/config/config.controller.ts`, `apps/web/lib/branding.ts`, `apps/admin/lib/branding.ts`

- Internationalization is a first-class concern across all three apps.
  - Evidence: `apps/{web,admin}/i18n/*`, `apps/{web,admin,server}/lang/*`, `apps/server/src/app.module.ts`

- Invite-based onboarding is part of the active account model. Open public registration is not detected in the active controller routes.
  - Evidence: `apps/server/src/modules/client/auth/auth.controller.ts`, `apps/server/src/modules/admin/accounts/invite.controller.ts`, `apps/server/src/modules/admin/users/user-invite.service.ts`

- Queue/worker runtime behavior is not detected yet even though BullMQ packages are present in `apps/server/package.json`.
