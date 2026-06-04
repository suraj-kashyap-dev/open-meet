---
name: repo-map
description: Orientation map for the open-meet monorepo. Use at the start of a task to find which app, module, and shared package own a feature (auth, meetings, meeting-scoped chat, persistent team chat, recording, RBAC, branding, uploads) before editing. Answers "where does this change go?".
---

# open-meet repo map

Monorepo: **pnpm workspaces + Turborepo**. Three apps + shared packages. Live API reference: Swagger at `http://localhost:3002/api/docs`.

## Apps

- **`apps/web`** — user-facing Next.js app. Routes `app/[locale]/`; features `features/web/{auth,home,lobby,meeting,chat,history,account}`; typed API wrappers `lib/api/`; `providers/`, `stores/`.
- **`apps/admin`** — admin console (Next.js). Routes `app/[locale]/`; features `features/{accounts,analytics,auth,branding,configuration,dashboard,groups,meetings,profile,rbac,users}`; API wrapper `lib/api/`.
- **`apps/server`** — NestJS + Fastify API, global `/api` prefix. Bootstrap/global: `src/main.ts`, `src/common/*`. User modules: `src/modules/client/{auth,meetings,chat,messaging,recording,settings}`. Admin modules: `src/modules/admin/*`. Public config: `src/modules/config`. Uploads: `src/modules/uploads`. Storage: `src/storage`. Realtime infra: `src/websocket`. Integrations: `src/integrations/{livekit,redis,mail}`. Prisma: `prisma/schema/*.prisma`. Tests: `test/unit`, `test/e2e`.

## Shared packages

- **`@open-meet/types`** (`packages/types`) — DTOs `src/dto/*`, API envelope `src/api.ts`, socket contracts `src/socket.ts`, RBAC catalog `src/permissions/*`.
- **`@open-meet/config`** — zod env schemas `src/env.ts`.
- **`@open-meet/ui`** — shared React primitives.
- **`@open-meet/utils`** — pure helpers.
- **`@open-meet/tailwind-config`**, **`@open-meet/typescript-config`** — shared presets.

## Where the change goes (by task)

| Task                                    | API                                                            | Frontend                                                       | Shared contract                               |
| --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| User auth                               | `modules/client/auth/*`                                        | `apps/web` `features/web/auth/*`                               | `dto/auth.ts`                                 |
| Meetings / lobby / scheduling           | `modules/client/meetings/*`                                    | `features/web/{meeting,lobby,home}`                            | `dto/meeting.ts`                              |
| Meeting-scoped chat / reactions / knock | `modules/client/chat/*` (`chat.gateway.ts`)                    | `features/web/meeting/*`                                       | `socket.ts` (`/meeting`)                      |
| Persistent team chat (DMs/groups)       | `modules/client/messaging/*` (`conversation.gateway.ts`)       | `features/web/chat/*`                                          | `dto/messaging.ts` + `socket.ts` (`/chat`)    |
| Recording                               | `modules/client/recording/*`                                   | meeting controls                                               | `dto/recording.ts`                            |
| Admin RBAC                              | `modules/admin/rbac/*`                                         | `apps/admin` `features/rbac/*`                                 | `permissions/*`                               |
| Branding / config                       | `modules/config/*`, `modules/admin/{branding,configuration}/*` | `lib/branding.ts`, admin `features/{branding,configuration}/*` | `dto/config.ts`                               |
| Uploads / storage                       | `modules/uploads/*`, `storage/*`                               | —                                                              | —                                             |
| Shared response / contracts             | —                                                              | —                                                              | `packages/types/src/{api.ts,dto/*,socket.ts}` |

When the owning area is unclear, **search before editing**. If you cannot confirm something from the repo, write **"Not detected yet"** rather than guess.

Deeper design: `.claude/docs/architecture.md`.
