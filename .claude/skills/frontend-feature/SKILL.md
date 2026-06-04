---
name: frontend-feature
description: Playbook for UI work in apps/web and apps/admin (Next.js App Router + next-intl). Use when adding pages, components, hooks, forms, or data fetching. Enforces Server Components by default, TanStack Query, react-hook-form + Zod, the typed API clients, @open-meet/ui primitives, and locale-aware routing.
---

# Frontend feature playbook (apps/web · apps/admin)

## Rules

- Default to **Server Components**. Add `'use client'` only for state, effects, browser APIs, or client hooks.
- **Data**: TanStack Query — `useQuery` for reads, `useMutation` for writes; declare query keys near the hook; invalidate only the affected keys; optimistic updates where realtime UX benefits.
- **HTTP**: always go through the per-app typed client `lib/api/client.ts` (keep `credentials: 'include'` and the `x-locale` header). No ad-hoc `fetch`.
- **Forms**: react-hook-form + Zod via `zodResolver`; submit through a Query mutation; surface success/error with the existing `sonner` toasts; reset/close only after success. Keep frontend limits aligned with the backend DTO.
- **UI**: reuse `@open-meet/ui` primitives before adding app-level base components; use existing Tailwind tokens + `cn` / `class-variance-authority`. Preserve branding/accent behavior — no one-off hardcoded colors (don't recolor the theme).
- **Routing / i18n**: preserve locale-prefixed routing; all user-facing copy via `next-intl` — see the `i18n-copy` skill.
- **Check both apps**: a shared change often needs parallel edits in `apps/web` and `apps/admin`. **Every new page ships a Playwright E2E test.**

## Validate

```
pnpm --filter @open-meet/web lint && pnpm --filter @open-meet/web typecheck && pnpm --filter @open-meet/web test
```

Add `... test:e2e` for new flows. Mirror with `@open-meet/admin` when admin changed.

Detailed rules: `.claude/docs/coding-rules.md`.
