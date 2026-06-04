---
name: write-spec
description: Use before implementing a non-trivial, multi-file or cross-app feature — write a short spec that names the real repo touchpoints first, then implement against it. Replaces ad-hoc guessing with a plan-first flow. Invoke as /write-spec <feature>.
---

# Write a feature spec (plan-first)

For multi-file or cross-app features, produce a spec **before** coding. Skip this for one-file diffs.

Reference actual apps/modules/packages/routes/DTOs/tests from this repo (use the `repo-map` skill); if a section is unknown, write **"Not detected yet"** rather than guess. If requirements are ambiguous, interview the user with `AskUserQuestion` before writing the spec.

Then: implement against the spec, validate (see `validate-changes`), and finish with the end-to-end verification step. Save the spec where the user wants it (default: paste it inline for approval, or write it next to the work as `<feature>.spec.md`).

## Template

**Goal** — the problem being solved + the user-visible outcome.

**Scope** — what's in scope / explicitly out of scope; existing rules that must stay true.

**Touchpoints (real repo paths)** — owning apps/modules; shared DTOs / socket contracts; which app(s) change (`apps/web`, `apps/admin`, `apps/server`).

**Database** — Prisma schema changes / migrations, or "No database changes" (see `prisma-schema`).

**API** — new/changed endpoints, DTOs, auth/guard/RBAC implications, socket/LiveKit contract changes (see `backend-feature`, `realtime-contracts`).

**Frontend** — routes, components, hooks, stores, queries; i18n copy (see `frontend-feature`, `i18n-copy`).

**Validation & permissions** — backend DTO + frontend Zod limits; upload constraints; who can use it (RBAC / guest / host).

**Edge cases** — empty / failure / race / realtime / backward-compatibility concerns.

**Verification checklist**

- [ ] Vitest unit
- [ ] API e2e (when HTTP/socket contracts change)
- [ ] Frontend unit
- [ ] Playwright (every new page)
- [ ] i18n keys added to all locales
- [ ] lint / typecheck / build identified and run
