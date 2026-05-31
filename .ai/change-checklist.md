# Change Checklist

## Before Editing

- Read `AGENTS.md`.
- Read the relevant `.ai/*` map or pattern docs.
- Inspect the real source files involved.
- Confirm whether the change is in:
  - `apps/web`
  - `apps/admin`
  - `apps/server`
  - `packages/*`
- Check for existing tests covering the area.
- Check the worktree so you do not overwrite unrelated user changes.

## Questions To Answer Before Implementing

- Which app or package owns the behavior?
- Is there already a hook/service/component/repository for this?
- Does the change touch shared DTOs or socket contracts?
- Does the change affect auth, RBAC, uploads, i18n, or realtime behavior?
- Will new copy need to be added to all locales?
- Will the change require database or migration work?

## When Editing Frontend Code

- Confirm whether the component must be client-side.
- Reuse the existing typed API client and TanStack Query hooks.
- Reuse `@open-meet/ui` primitives before creating new ones.
- Check whether both `apps/web` and `apps/admin` need parallel changes.
- Check locale-aware navigation and translation usage.

## When Editing Backend Code

- Keep controllers thin.
- Keep business logic in services.
- Keep Prisma access in repositories.
- Use DTO validation and existing error codes.
- Preserve the global success/error envelope behavior.
- If websocket behavior changes, update shared socket contracts first.

## When Editing Shared Packages

- Confirm every importing app/service still matches the new contract.
- Prefer additive changes unless a breaking change is explicitly intended.
- Validate affected consumers with filtered checks where possible.

## Validation Matrix

### Docs-only changes

- verify file tree and content

### Web app changes

- `pnpm --filter @open-meet/web lint`
- `pnpm --filter @open-meet/web typecheck`
- `pnpm --filter @open-meet/web test`
- `pnpm --filter @open-meet/web test:e2e` when flow-level behavior changed

### Admin app changes

- `pnpm --filter @open-meet/admin lint`
- `pnpm --filter @open-meet/admin typecheck`
- `pnpm --filter @open-meet/admin test`
- `pnpm --filter @open-meet/admin test:e2e` when flow-level behavior changed

### Server changes

- `pnpm --filter @open-meet/server lint`
- `pnpm --filter @open-meet/server typecheck`
- `pnpm --filter @open-meet/server test`
- `pnpm --filter @open-meet/server test:e2e` when HTTP/auth/realtime contracts changed

### Shared package changes

- run the relevant filtered `lint`, `typecheck`, `test`, and then validate importing apps if needed

## Before Finishing

- Summarize the files changed.
- Summarize the validation run.
- Call out any skipped checks.
- Call out any remaining risks or `Not detected yet` gaps.
