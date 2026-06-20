---
name: backend-feature
description: Playbook for adding or changing API behavior in apps/server (NestJS + Fastify). Use when implementing endpoints, services, repositories, DTOs, guards, or gateways. Enforces controller→service→repository layering, the shared response/error envelope, DTO validation, and the separate user/admin auth systems.
---

# Backend feature playbook (apps/server)

Layering — keep it intact: **controller → service → repository**.

- **Controllers**: parse input, apply guards/decorators, delegate to a service. No business logic, no Prisma.
- **Services**: business logic, orchestration, DTO mapping.
- **Repositories**: own all Prisma queries. Never inject `PrismaService` into a controller.

## Steps

1. Find the owning module under `src/modules/client/*` (user) or `src/modules/admin/*` (admin) — use the `repo-map` skill. Reuse it; don't create a parallel module.
2. If the request/response shape changes, update the DTO in `packages/types/src/dto/*` first, then the `class-validator` DTO class in the module.
3. Validate HTTP input with DTO classes + the global `ValidationPipe`. Use `ZodValidationPipe` only for naturally zod-shaped payloads. **Never loosen validation just to compile.**
4. Keep responses on the shared envelope: success via `TransformInterceptor` (`ApiSuccess<T>`), errors via `GlobalExceptionFilter` (`ApiError`). Throw Nest HTTP exceptions with repo-defined error codes. `@SkipTransform()` only for raw/streamed responses.
5. Reuse existing decorators/guards: `@Public()`, `@CurrentUser()`, `@CurrentAdmin()`, `@RequirePermissions()`. **User auth and admin auth are separate systems** — don't cross them. Admin routes live under `/api/admin/*`.
6. Realtime work: socket event names/payloads belong in `@open-meet/types` — see the `realtime-contracts` skill, never inline strings.
7. Schema work: see the `prisma-schema` skill.

## Validate

```
pnpm --filter @open-meet/server lint && pnpm --filter @open-meet/server typecheck && pnpm --filter @open-meet/server test
```

Add Vitest unit coverage; add `pnpm --filter @open-meet/server test:e2e` when HTTP/auth/realtime contracts change. Then consider the `code-reviewer` subagent.

Detailed rules: `.claude/docs/coding-rules.md`.
