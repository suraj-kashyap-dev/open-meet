# Specs README

Use this folder for future feature specifications before implementation starts. Specs should describe the real repo touchpoints, not generic ideas.

Rules for new specs:

- Reference actual apps, modules, packages, routes, DTOs, and tests from this repo.
- Call out both user-facing and admin-facing impact when relevant.
- Mention existing patterns you intend to reuse.
- If a section is unknown, write `Not detected yet` instead of guessing.

## Reusable Spec Template

```md
# <Feature Name>

## Goal

- What problem is being solved?
- What user-visible outcome should exist after implementation?

## User Roles

- Which roles are involved?
- User app, admin app, guests, hosts, admins, or service-to-service?

## Business Rules

- Required behaviors
- Explicit non-goals
- Existing rules that must remain true

## Database Changes

- Prisma schema changes
- New models/fields/indexes/relations
- Migration notes
- If none: `Not detected yet` or `No database changes`

## API Changes

- New or changed endpoints
- DTO/request/response changes
- Auth/guard/RBAC implications
- WebSocket or LiveKit contract changes if applicable

## Frontend Changes

- Affected app(s): `apps/web`, `apps/admin`
- Route changes
- New/updated components, hooks, stores, or queries
- i18n copy changes

## Validation Rules

- Backend DTO validation
- Frontend form validation
- File upload/content-type/size constraints

## Permissions / RBAC

- Who can view/use the feature?
- Admin permissions required
- Guest/host/user restrictions

## Edge Cases

- Empty states
- Failure states
- Race conditions / realtime concerns
- Backward compatibility concerns

## Testing Checklist

- [ ] Unit tests added/updated
- [ ] API e2e tests added/updated
- [ ] Frontend unit tests added/updated
- [ ] Playwright coverage added/updated
- [ ] i18n keys added to all required locales
- [ ] Lint/typecheck/build commands identified
```
