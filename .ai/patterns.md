# Patterns

Use these patterns before inventing new ones. The examples below are drawn from the current codebase.

## API Pattern

- Client-side API calls go through a typed fetch wrapper in each app.
  - Examples:
    - `apps/web/lib/api/client.ts`
    - `apps/admin/lib/api/client.ts`
- Feature services are thin wrappers over the shared client.
  - Examples:
    - `apps/web/features/web/auth/services/auth.ts`
    - `apps/admin/features/accounts/services/accounts.ts`
- Server-side API code follows controller -> service -> repository separation.
  - Examples:
    - `apps/server/src/modules/client/meetings/meetings.controller.ts`
    - `apps/server/src/modules/client/meetings/meetings.service.ts`
    - `apps/server/src/modules/client/meetings/meetings.repository.ts`

## UI Pattern

- Shared primitives live in `@open-meet/ui`; feature UIs compose those primitives locally.
  - Examples:
    - `packages/ui/src/button.tsx`
    - `packages/ui/src/dialog.tsx`
    - `packages/ui/src/data-table.tsx`
- Feature components live close to their feature domain.
  - Examples:
    - `apps/web/features/web/auth/components/login-form.tsx`
    - `apps/admin/features/accounts/components/create-admin-dialog.tsx`
- App layouts compose i18n, branding, providers, and toasters at the route root.
  - Examples:
    - `apps/web/app/[locale]/layout.tsx`
    - `apps/admin/app/[locale]/layout.tsx`

## Form Pattern

- Build a Zod schema, pass it through `zodResolver`, and submit through a TanStack Query mutation.
- Show success/error feedback through `sonner` toasts.
- Reset or close the form only after successful mutation completion.
- Examples:
  - `apps/web/features/web/auth/components/login-form.tsx`
  - `apps/web/features/web/auth/components/accept-invite-form.tsx`
  - `apps/admin/features/accounts/components/create-admin-dialog.tsx`

## Auth Pattern

- Web auth state is query-backed and hydrated from a small localStorage cache after mount.
  - Example: `apps/web/features/web/auth/hooks/use-auth.ts`
- Server auth controllers set cookies; services issue/rotate tokens and coordinate with Redis.
  - Examples:
    - `apps/server/src/modules/client/auth/auth.controller.ts`
    - `apps/server/src/modules/client/auth/auth.service.ts`
- Admin auth is separate and layered with role/permission checks.
  - Examples:
    - `apps/server/src/modules/admin/auth/auth.controller.ts`
    - `apps/server/src/modules/admin/rbac/admin-permissions.guard.ts`

## Query / Data Fetching Pattern

- Query keys are declared near their hooks.
- `useQuery` handles reads, `useMutation` handles writes, and mutations invalidate only the affected keys.
- Optimistic updates are used where realtime UX benefits from them.
- Examples:
  - `apps/web/features/web/auth/hooks/use-auth.ts`
  - `apps/web/features/web/chat/hooks/use-chat.ts`
  - `apps/admin/features/accounts/hooks/use-admin-accounts.ts`

## Validation Pattern

- Backend HTTP validation uses DTO classes plus the global `ValidationPipe`.
  - Examples:
    - `apps/server/src/modules/client/auth/dto/login.dto.ts`
    - `apps/server/src/modules/client/meetings/dto/schedule-meeting.dto.ts`
- Optional zod pipe support exists for zod-native payloads.
  - Example: `apps/server/src/common/pipes/zod-validation.pipe.ts`
- Frontend validation uses Zod + `zodResolver`.
  - Examples:
    - `apps/web/features/web/auth/components/login-form.tsx`
    - `apps/admin/features/accounts/components/create-admin-dialog.tsx`
- Environment validation is centralized in a shared package.
  - Example: `packages/config/src/env.ts`
