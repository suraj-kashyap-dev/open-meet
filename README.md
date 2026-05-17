<div align="center">

# 🎥 Open Meet

**Self-hostable, real-time video conferencing for distributed teams.**
Full-stack TypeScript · LiveKit SFU · multi-instance ready.

<sub>
  <img alt="Node 22" src="https://img.shields.io/badge/Node-22%20LTS-3c873a?logo=node.js&logoColor=white"/>
  <img alt="Next.js 15" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white"/>
  <img alt="NestJS 11" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white"/>
  <img alt="LiveKit" src="https://img.shields.io/badge/LiveKit-SFU-FF5C5C"/>
  <img alt="Prisma 6" src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white"/>
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white"/>
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-blue"/>
</sub>

<br/>

![Dashboard](docs/screenshots/03-dashboard.png)

</div>

---

## ✨ Highlights

|                               |                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 🚀 **Instant rooms**          | One-click `xxxx-xxxx-xxxx` meeting codes, room-scoped JWT tokens, host transfer on the way.                               |
| 🎛️ **Real pre-join**          | Lobby with camera preview, device pickers, mic level meter, and persisted defaults.                                       |
| 💬 **Realtime chat**          | Socket.IO `/meeting` namespace, fanned out via `@socket.io/redis-adapter` so the API scales horizontally.                 |
| ✋ **Reactions & raise hand** | Live overlay reactions, raised-hand indicator surfaced in tiles and the participants panel.                               |
| 🔐 **Hardened auth**          | `argon2` hashing, httpOnly access + refresh cookies, refresh-token rotation hashed in Redis, throttling on `/api/auth/*`. |
| 🧰 **Typed end-to-end**       | One `@open-meet/types` package shared between API + Web for DTOs, socket events, and response envelopes.                  |
| 🧪 **Tested**                 | Vitest unit suites for services + repositories, Playwright E2E for every user-visible flow.                               |
| 📦 **Self-hostable**          | Bring-your-own Postgres, Redis, LiveKit, coturn — all wired in `docker-compose.yml`.                                      |

---

## 🧭 Tour

<table>
  <tr>
    <td width="50%"><img alt="Sign in" src="docs/screenshots/01-login.png"/></td>
    <td width="50%"><img alt="Sign up" src="docs/screenshots/02-register.png"/></td>
  </tr>
  <tr>
    <td><b>Sign in</b><br/><sub>Cookies-based JWT (7 d access · 7 d refresh). Refresh rotates on use.</sub></td>
    <td><b>Sign up</b><br/><sub>Zod-validated form. <code>argon2</code> hashed at rest.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img alt="Dashboard" src="docs/screenshots/03-dashboard.png"/></td>
  </tr>
  <tr>
    <td colspan="2"><b>Dashboard</b><br/><sub>One-click meeting create, code-to-join field, history rail.</sub></td>
  </tr>
  <tr>
    <td><img alt="Lobby" src="docs/screenshots/04-lobby.png"/></td>
    <td><img alt="Meeting" src="docs/screenshots/05-meeting.png"/></td>
  </tr>
  <tr>
    <td><b>Lobby</b><br/><sub>Camera preview, device pickers, mic level, persisted defaults. Camera-off shows your avatar.</sub></td>
    <td><b>Meeting</b><br/><sub><code>useTracks([Camera, ScreenShare])</code> grid with raised-hand badges and reactions overlay.</sub></td>
  </tr>
  <tr>
    <td><img alt="Participants" src="docs/screenshots/06-participants.png"/></td>
    <td><img alt="Chat" src="docs/screenshots/07-chat.png"/></td>
  </tr>
  <tr>
    <td><b>Participants</b><br/><sub>Host crown, mic/camera state per-participant, raised-hand indicator.</sub></td>
    <td><b>Chat</b><br/><sub>WS-backed, persisted to Postgres, history rehydrates on rejoin.</sub></td>
  </tr>
</table>

---

## 🚀 Quick start

The one-shot installer (Laravel `artisan`-style) wires up env files, secrets, the LiveKit key pair, the database, and the first admin user in a single command.

```bash
# 1 · install workspace dependencies
pnpm install

# 2 · spin up infra (postgres, redis, livekit, coturn, mailhog)
docker compose up -d

# 3 · run the interactive installer
pnpm app:install

# 4 · start both apps
pnpm dev
```

Open **<http://localhost:3000>** → sign in with the admin you just created → **New meeting**. Swagger lives at **<http://localhost:3001/api/docs>**.

### What `pnpm app:install` does

The installer at `scripts/install.ts` walks you through the bootstrap interactively. It will:

1. Prompt for **admin name, email, password**, plus the Postgres / Redis / frontend / API / LiveKit URLs (sensible defaults pre-filled).
2. **Generate fresh secrets** with `crypto.randomBytes` and `base64url` encoding:
   - `JWT_ACCESS_SECRET` · `JWT_REFRESH_SECRET` · `ADMIN_JWT_ACCESS_SECRET` (64 bytes each)
   - `LIVEKIT_API_KEY` (LiveKit-conventional `API` + 12 chars) and `LIVEKIT_API_SECRET` (32 bytes)
3. **Write `apps/server/.env`** and **`apps/web/.env.local`** from the committed `.env.example` templates, keeping the comments intact.
4. **Update `docker/livekit.yaml`** so the LiveKit container, the API server, and the web client all share the same fresh `apiKey` / `apiSecret` pair.
5. Run **`prisma generate`** and **`prisma migrate deploy`** against your Postgres (skippable if you'd rather do it later).
6. **Create the first admin user** in the database (`argon2id` hashed, `SUPERADMIN` role) via `scripts/install/create-admin.ts`.

If the installer detects existing env files, it asks before overwriting them. On Windows, if the Prisma query-engine DLL is locked (e.g. `pnpm dev` or Prisma Studio is open), the installer pauses and lets you retry after stopping the offending process.

To re-run it cleanly, stop `pnpm dev` first, then `pnpm app:install` again.

### `--force`: complete reinstall (wipes the database)

```bash
pnpm app:install --force
```

Use this when you want a clean slate — first-time setup gone wrong, schema drift, or just resetting a dev environment. The flag changes three things:

- Existing `apps/server/.env` and `apps/web/.env.local` are **overwritten without prompting**.
- `prisma migrate deploy` is replaced with **`prisma migrate reset --force --skip-seed`**, which **drops every table** (meetings, messages, users, admins, recordings — everything) and re-applies all migrations from scratch.
- The admin user is re-created from your fresh prompt input.

The installer shows a single confirmation prompt before doing this. **There is no undo** — back up `pg_dump` if you care about the data.

### Database shortcuts

If you just want to nuke the database without rerunning the whole installer:

```bash
pnpm db:reset    # interactive — prisma asks for confirmation before dropping
pnpm db:wipe     # non-interactive — drops and re-applies migrations immediately
pnpm db:studio   # open Prisma Studio at http://localhost:5555
```

Both `db:reset` and `db:wipe` are `prisma migrate reset --skip-seed` wrappers. They drop every table, recreate the schema from `apps/server/prisma/migrations/`, and leave the database empty — so the admin bootstrap service will recreate the default admin from `DEFAULT_ADMIN_*` env vars on the next API start. If you'd rather pick a fresh admin email/password, run `pnpm app:install --force` instead.

> Requires **Node 22 LTS**, **pnpm ≥ 9**, **Docker Desktop**. The `.env.example` files document every variable consumed by `apiEnvSchema` / `webPublicEnvSchema` in `packages/config/src/env.ts`.

---

## 🧪 Testing

```bash
pnpm --filter @open-meet/server test                  # vitest — services, repositories, guards
pnpm --filter @open-meet/e2e install:browsers         # one-time Playwright deps
pnpm --filter @open-meet/e2e test                     # unit + browser e2e
pnpm --filter @open-meet/e2e screenshots              # regenerate docs/screenshots/*
```

---

<div align="center">
<sub>Built with TypeScript end-to-end. MIT licensed.</sub>
</div>
