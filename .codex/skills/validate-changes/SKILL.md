---
name: validate-changes
description: Use before finishing a task to pick and run the narrowest relevant checks for what you changed, and to self-review the change checklist. Maps the changed area to the exact lint/typecheck/test commands.
---

# Validate changes (run the narrowest relevant checks)

## Self-review checklist

- Which app/package owns the change? Did you **reuse** existing hooks/services/components/repositories instead of duplicating?
- Touch shared DTOs or `socket.ts`? Update every consumer (see `realtime-contracts`).
- Touch auth / RBAC / uploads / i18n / realtime? Preserve existing behavior; don't loosen validation.
- New user-facing copy? All locales + `pnpm i18n:verify` (see `i18n-copy`).
- DB change? Migration created (see `prisma-schema`).
- New page? Playwright E2E added.

## Validation matrix

- **Web** (`apps/web`): `pnpm --filter @open-meet/web lint && … typecheck && … test`; add `… test:e2e` when a flow changed.
- **Admin** (`apps/admin`): same with `@open-meet/admin`.
- **Server** (`apps/server`): `pnpm --filter @open-meet/server lint && … typecheck && … test`; add `… test:e2e` when HTTP/auth/realtime contracts changed.
- **Shared package**: filtered `lint` / `typecheck` / `test`, then validate importing apps (`@open-meet/types` is consumed by all three).
- **Whole repo** (cross-cutting): `pnpm lint && pnpm typecheck && pnpm test` and `pnpm i18n:verify`.

Run the **narrowest** check first; widen only if the change is cross-cutting. If a check is skipped or blocked, say so explicitly.

## Before finishing

Summarize the files changed, which checks ran (and their results), any skipped/blocked checks, and remaining risks. For anything non-trivial, get an independent review via the `code-reviewer` subagent or the built-in `/code-review`.

Full command reference: `.claude/docs/project-commands.md`.
