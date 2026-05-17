# open-meet

Real-time video conferencing for distributed teams, built on a fully TypeScript stack.

- **Frontend:** Next.js 15 (App Router) · React 19 · Tailwind v4 · shadcn/ui · TanStack Query v5 · Zustand v5 · `@livekit/components-react` · socket.io-client
- **API:** NestJS v11 on Fastify · Prisma v6 · argon2 + JWT (httpOnly cookies, refresh rotation in Redis) · `@nestjs/throttler` · `@nestjs/swagger`
- **Realtime media:** LiveKit (Docker) · coturn (Docker)
- **Realtime app:** Socket.IO v4 with `@socket.io/redis-adapter` (multi-instance ready)
- **Infra:** PostgreSQL 16 · Redis 7 · MailHog (dev)
- **Tooling:** pnpm workspaces · Turborepo v2 · ESLint v9 flat config · Prettier 3 · Vitest + Supertest · Playwright

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 (22 LTS recommended) | |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Docker Desktop | latest | Required for Postgres, Redis, LiveKit, coturn, MailHog |
| Git | any | |

A modern browser (Chrome/Edge/Firefox) for WebRTC.

---

## 1. Install

```bash
git clone <your-fork-url> open-meet
cd open-meet
pnpm install
```

> First-time install runs the Prisma postinstall to generate the typed client.

## 2. Configure environment

The repo ships dev defaults so the app boots without manual setup. Each app has its own example file as the canonical reference:

- `apps/server/.env.example` → copy to `apps/server/.env` (backend secrets, already pre-filled for local dev)
- `apps/web/.env.example` → copy to `apps/web/.env.local` (frontend public vars, already pre-filled for local dev)

If you change any value, update the matching `.env.example` at the same time so onboarding stays in sync.

## 3. Start the infrastructure stack

### 3a. Make sure the Docker engine is running

The API will crash on boot with `PrismaClientInitializationError: Can't reach database server at localhost:5432` if Postgres isn't up — and Postgres only runs once the Docker engine itself is running.

**Windows / macOS** — open Docker Desktop and wait until the whale icon in the tray shows **Engine running** (status bar at the bottom-left turns green). You can also launch it from a terminal:

```powershell
# Windows (PowerShell)
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

```bash
# macOS
open -a Docker
```

```bash
# Linux (systemd)
sudo systemctl start docker
```

Verify the engine is reachable before continuing:

```bash
docker info        # should print server info, not a connect error
```

### 3b. Bring the stack up

From the repo root:

```bash
docker compose up -d
```

Brings up:

| Service | Container | Port(s) | Purpose |
|---|---|---|---|
| `postgres` | `openmeet-postgres` | 5432 | Primary DB (`openmeet`) |
| `redis` | `openmeet-redis` | 6379 | Sessions, refresh tokens, Socket.IO adapter |
| `livekit` | `openmeet-livekit` | 7880 (WS), 7881, 7882/udp | SFU |
| `coturn` | `openmeet-coturn` | 3478, 5349, 49160-49200/udp | STUN/TURN |
| `mailhog` | `openmeet-mailhog` | 1025 (SMTP), 8025 (UI) | Dev email catcher → http://localhost:8025 |

### 3c. Wait for health and verify

```bash
docker compose ps
```

`postgres`, `redis`, and `livekit` should report `(healthy)` before you start the API. If any service is still `starting`, wait a few seconds and re-run. Typical first-boot is ~10–20 s while Postgres initialises the data volume.

### 3d. Useful service commands

```bash
docker compose up -d                 # start everything (idempotent)
docker compose up -d postgres redis  # start a subset
docker compose ps                    # status + health
docker compose logs -f livekit       # tail a single service
docker compose restart postgres      # restart one service
docker compose stop                  # stop containers, keep volumes
docker compose down                  # stop + remove containers (volumes kept)
docker compose down -v               # nuke containers AND data volumes (fresh DB)
```

> The compose project is named `openmeet` (see `docker-compose.yml`), so containers are prefixed `openmeet-*` and the project shows up as `openmeet` in Docker Desktop.

## 4. Apply database migrations

```bash
pnpm --filter @open-meet/server prisma:migrate dev --name init
```

This creates the `User`, `Meeting`, `Participant`, `Message`, `Recording` tables and runs `prisma generate`.

## 5. Run the apps in dev mode

```bash
pnpm dev          # turbo: runs api + web in parallel
```

Or separately:

```bash
pnpm --filter @open-meet/server dev      # http://localhost:3001 (Swagger at /api/docs)
pnpm --filter @open-meet/web dev      # http://localhost:3000
```

Open http://localhost:3000, register a new account, and click **New meeting**.

---

## Testing

### Unit (Vitest)

```bash
pnpm --filter @open-meet/server test           # service unit tests
pnpm --filter @open-meet/server test:watch
```

Current coverage: `AuthService` (6), `MeetingsService` (8), `LiveKitService` (3).

### End-to-end (Playwright)

First-time browser binaries install (~500 MB, one-time):

```bash
pnpm --filter @open-meet/e2e install:browsers
```

Run smoke + form-validation tests (no backend needed):

```bash
pnpm --filter @open-meet/e2e test
```

Run the full meeting-creation flow (requires Docker stack + API running):

```bash
RUN_FULL_E2E=1 pnpm --filter @open-meet/e2e test
```

Playwright's `webServer` will auto-start `apps/web` in dev — make sure port 3000 is free.

Headed / debug:

```bash
pnpm --filter @open-meet/e2e test:headed
pnpm --filter @open-meet/e2e test:ui
```

---

## Project structure

```
open-meet/
├── apps/
│   ├── server/                    NestJS + Fastify backend
│   │   ├── prisma/                schema.prisma + migrations
│   │   └── src/
│   │       ├── main.ts            bootstrap (Fastify, Swagger, cookies, RedisIoAdapter)
│   │       ├── app.module.ts      global guards: JwtAuth + Throttler
│   │       ├── common/            decorators, filters, interceptors, pipes
│   │       ├── prisma/            PrismaService (lifecycle-managed)
│   │       ├── redis/             ioredis singleton + pub/sub pair
│   │       ├── ws/                RedisIoAdapter for Socket.IO scale-out
│   │       └── modules/
│   │           ├── auth/          register/login/refresh/logout/me + JWT strategy
│   │           ├── meetings/      create/get/join/leave/end + participants
│   │           ├── livekit/       token mint + webhook
│   │           └── chat/          WS gateway, message persistence, WsJwtGuard
│   ├── web/                       Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── (auth)/            login + register
│   │   │   └── (app)/             AuthGuard-protected: home, meeting/[code]/*
│   │   ├── components/
│   │   │   ├── ui/                shadcn/ui primitives
│   │   │   ├── auth/              login/register forms, auth guard
│   │   │   ├── home/              create + join actions
│   │   │   ├── layout/            app header
│   │   │   ├── lobby/             camera preview, device selector
│   │   │   └── meeting/           VideoGrid, Controls, Chat, Participants, Reactions
│   │   ├── hooks/                 use-auth, use-meetings, use-socket, use-media-devices
│   │   ├── lib/                   typed API client (cookies, error envelope)
│   │   └── stores/                Zustand (meeting, chat, ui)
│   └── e2e/                       Playwright tests
│       └── tests/                 smoke, auth, meeting-flow
├── packages/
│   ├── types/                     shared DTOs + socket event types (@open-meet/types)
│   ├── config/                    zod env schemas (@open-meet/config)
│   └── utils/                     pure helpers — meeting code gen, duration fmt
├── docker/                        livekit.yaml, coturn.conf
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md                      conventions for future Claude Code sessions
```

---

## Common commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev (both apps) | `pnpm dev` |
| Build (all) | `pnpm build` |
| Typecheck (all) | `pnpm typecheck` |
| Lint (all) | `pnpm lint` |
| Format | `pnpm format` |
| Unit tests | `pnpm --filter @open-meet/server test` |
| E2E tests | `pnpm --filter @open-meet/e2e test` |
| Prisma Studio | `pnpm --filter @open-meet/server prisma:studio` |
| Prisma generate | `pnpm --filter @open-meet/server prisma:generate` |
| Reset DB | `pnpm --filter @open-meet/server prisma:reset` |
| Bring up infra | `docker compose up -d` |
| Tear down infra | `docker compose down` |
| Tail a service | `docker compose logs -f livekit` |

---

## How the call surface works

1. **Sign in** — `POST /api/auth/login` sets two httpOnly cookies: `access_token` (15m) and `refresh_token` (7d, path-scoped to `/api/auth`). Refresh rotates the token and persists the new hash in Redis.
2. **Create meeting** — `POST /api/meetings` returns a 12-char `xxxx-xxxx-xxxx` code (collision-retry up to 5x).
3. **Lobby** — `/meeting/[code]/lobby` does pre-join with `navigator.mediaDevices.getUserMedia` (camera/mic preview + device pickers). Stops the preview before joining.
4. **Join** — `/meeting/[code]` calls `POST /meetings/:code/join` (upserts Participant + transitions WAITING → ACTIVE), then `POST /livekit/token` to mint a room-scoped JWT (4h TTL, `roomAdmin: true` for the host only).
5. **Media** — `<LiveKitRoom>` from `@livekit/components-react` connects to the SFU; tiles render via `useTracks([Camera, ScreenShare])`. Audio rendering by `<RoomAudioRenderer />`.
6. **Chat + presence** — Socket.IO connects on the `/meeting` namespace. `WsJwtGuard` authenticates from cookies on handshake. Events flow through `@socket.io/redis-adapter` so multi-instance API works out of the box.
7. **End for all** — host-only `POST /meetings/:code/end` sets status to ENDED, emits `meeting:ended` via the gateway, and clients call `room.disconnect()` → `/meeting/[code]/ended`.

---

## API surface

All responses use this envelope (enforced globally):

```json
{ "success": true, "data": { ... }, "meta": { "timestamp": "..." } }
```

Errors:

```json
{ "success": false, "error": { "code": "MEETING_NOT_FOUND", "message": "...", "statusCode": 404 } }
```

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | Liveness probe |
| POST | `/api/auth/register` | public | Create user, set cookies |
| POST | `/api/auth/login` | public | Verify creds, set cookies |
| POST | `/api/auth/refresh` | public¹ | Rotate refresh token |
| POST | `/api/auth/logout` | required | Invalidate refresh + clear cookies |
| GET | `/api/auth/me` | required | Current user |
| POST | `/api/meetings` | required | Create meeting |
| GET | `/api/meetings/:code` | required | Get meeting |
| POST | `/api/meetings/:code/join` | required | Join (upsert participant) |
| POST | `/api/meetings/:code/leave` | required | Mark left |
| POST | `/api/meetings/:code/end` | required + host | End for all |
| GET | `/api/meetings/:code/participants` | required | Active participants |
| POST | `/api/livekit/token` | required | Mint LiveKit room token |
| POST | `/api/livekit/webhook` | LiveKit signature | Webhook (`room_finished`, etc.) |

¹ Refresh route reads the refresh cookie; the access cookie is not required.

Full interactive docs at **http://localhost:3001/api/docs** when the API is running.

---

## WebSocket events (`/meeting` namespace)

Client → Server:

| Event | Payload |
|---|---|
| `meeting:join` | `{ meetingCode }` |
| `meeting:leave` | `{ meetingCode }` |
| `chat:send` | `{ meetingCode, content }` |
| `reaction:send` | `{ meetingCode, emoji }` |
| `hand:raise` | `{ meetingCode }` |
| `hand:lower` | `{ meetingCode }` |

Server → Client:

| Event | Payload |
|---|---|
| `meeting:participant-joined` | `{ participant }` |
| `meeting:participant-left` | `{ participantId }` |
| `meeting:ended` | `{ endedAt }` |
| `chat:message` | `{ id, content, sender, sentAt, meetingId }` |
| `reaction:received` | `{ emoji, senderId, senderName }` |
| `hand:raised` | `{ userId, name }` |
| `hand:lowered` | `{ userId }` |
| `presence:update` | `{ participants[] }` |

Event names and payload types live in `@open-meet/types/socket` — single source of truth shared by both apps.

---

## Troubleshooting

**`PrismaClientInitializationError: Can't reach database server at localhost:5432`** — Postgres isn't accepting connections. Either the Docker engine isn't running or the `postgres` container hasn't started yet. Run `docker info` (must succeed), then `docker compose up -d` and wait for `docker compose ps` to show `postgres` as `(healthy)` before starting the API.

**`error during connect: open //./pipe/dockerDesktopLinuxEngine`** — Docker Desktop isn't running. Start it (see [3a](#3a-make-sure-the-docker-engine-is-running)) and wait for the engine to come up before retrying any `docker` command.

**Port 5432 / 6379 / 7880 already in use** — another local Postgres/Redis/LiveKit instance is bound to the port. Stop the conflicting service or change the host-side port mapping in `docker-compose.yml` (e.g. `"5433:5432"`) and update `DATABASE_URL` in `apps/server/.env` to match.

**`pnpm install` ignores build scripts** — Approved native modules (Prisma, argon2, sharp, swc) are listed under `onlyBuiltDependencies` in `pnpm-workspace.yaml`. If a new native dep is added, append it there and run `pnpm rebuild <pkg>`.

**Camera/mic permission denied in Playwright** — The Chromium project in `apps/e2e/playwright.config.ts` sets `permissions: ['camera', 'microphone']` and launches with `--use-fake-ui-for-media-stream`. If a test still hangs, confirm those flags reach the browser (no profile overrides).

**Migrations fail with `database "openmeet" does not exist`** — Wait for the Postgres healthcheck (`docker compose ps` should show `(healthy)`), then re-run the migrate command.

**LiveKit webhook 403** — In dev the secret defaults to `secret` (matching `apps/server/.env` → `LIVEKIT_API_SECRET`). If you change one, change both.

---

## License

MIT (or whatever you ship under). Update this section when you pick one.
