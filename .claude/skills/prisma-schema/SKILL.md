---
name: prisma-schema
description: Use for database/schema work in apps/server — adding models, fields, relations, indexes, or migrations. The Prisma schema is split into multiple files by domain; this skill keeps edits and migrations in the right place.
---

# Prisma schema & migrations

The schema is **split by domain** under `apps/server/prisma/schema/` (`user.prisma`, `meeting.prisma`, `chat.prisma`, `messaging.prisma`, `admin.prisma`, `rbac.prisma`, `recording.prisma`, `schema.prisma`), configured via `apps/server/prisma.config.ts`. Migrations live **inside** `apps/server/prisma/schema/migrations`.

## Steps

1. Put the model/field in the domain file it belongs to — don't dump everything in `schema.prisma`.
2. Keep all queries in repositories (see the `backend-feature` skill) — never query Prisma from a controller.
3. Generate + migrate through the server workspace:
   ```
   pnpm --filter @open-meet/server prisma:generate
   pnpm --filter @open-meet/server prisma:migrate
   ```
4. Schema changes are destructive territory — **confirm before resetting data**. `pnpm db:reset` / `pnpm db:wipe` drop every table.
5. If a DTO exposes the new shape, update `packages/types/src/dto/*` and the mapping in the service.

## Validate

```
pnpm --filter @open-meet/server prisma:generate && pnpm --filter @open-meet/server typecheck && pnpm --filter @open-meet/server test
```
