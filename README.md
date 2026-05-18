<div align="center">

<img src="docs/logo.svg" alt="Open Meet" width="96" height="96"/>

# Open Meet

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
<br/>

[**Highlights**](#-highlights) · [**Tour**](#-tour) · [**Quick start**](#-quick-start) · [**Testing**](#-testing)

<br/>

![Dashboard](docs/screenshots/03-dashboard.png)

</div>

---

## ✨ Highlights

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🚀 Instant rooms</h3>
      <p>One-click <code>xxxx-xxxx-xxxx</code> meeting codes, room-scoped JWT tokens, host transfer on the way.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎛️ Real pre-join</h3>
      <p>Lobby with camera preview, device pickers, mic level meter, and persisted defaults.</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>💬 Realtime chat</h3>
      <p>Socket.IO <code>/meeting</code> namespace, fanned out via <code>@socket.io/redis-adapter</code> so the API scales horizontally.</p>
    </td>
    <td valign="top">
      <h3>✋ Reactions & raise hand</h3>
      <p>Live overlay reactions, raised-hand indicator surfaced in tiles and the participants panel.</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🔐 Hardened auth</h3>
      <p><code>argon2</code> hashing, httpOnly access + refresh cookies, refresh-token rotation hashed in Redis, throttling on <code>/api/auth/*</code>.</p>
    </td>
    <td valign="top">
      <h3>🧰 Typed end-to-end</h3>
      <p>One <code>@open-meet/types</code> package shared between API + Web for DTOs, socket events, and response envelopes.</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🧪 Tested</h3>
      <p>Vitest unit suites for services + repositories, Playwright E2E for every user-visible flow.</p>
    </td>
    <td valign="top">
      <h3>📦 Self-hostable</h3>
      <p>Bring-your-own Postgres, Redis, LiveKit, coturn — all wired in <code>docker-compose.yml</code>.</p>
    </td>
  </tr>
</table>

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

> [!NOTE]
> **Prereqs:** Node 22 LTS · pnpm ≥ 9 · Docker Desktop.
> Every env var is documented in the `.env.example` files and validated by `apiEnvSchema` / `webPublicEnvSchema` in `packages/config/src/env.ts`.

The one-shot installer wires up env files, secrets, the LiveKit key pair, the database, and the first admin user — all in one command.

```bash
pnpm install            # 1 · workspace deps
docker compose up -d    # 2 · postgres · redis · livekit · coturn · mailhog
pnpm app:install        # 3 · interactive installer
pnpm dev                # 4 · start api + web
```

Then:

- Web → **<http://localhost:3000>** — sign in with the admin you just created, click **New meeting**.
- API docs (Swagger) → **<http://localhost:3001/api/docs>**.

### Reset everything: `pnpm app:install --force`

> [!WARNING]
> **There is no undo.** Drops every table — `pg_dump` first if the data matters.

Use this for a clean slate (first-time setup gone wrong, schema drift, fresh dev env). The flag changes three things:

- `apps/server/.env` and `apps/web/.env.local` are **overwritten without prompting**.
- `prisma migrate deploy` is swapped for **`prisma migrate reset --force --skip-seed`**, which **drops every table** (meetings · messages · users · admins · recordings) and re-applies migrations from scratch.
- The admin user is re-created from your fresh prompt input.

The installer shows a single confirmation prompt before proceeding.

### Database shortcuts

```bash
pnpm db:reset     # interactive — prisma confirms before dropping
pnpm db:wipe      # non-interactive — drops + re-applies immediately
pnpm db:studio    # open Prisma Studio at http://localhost:5555
```

Both `db:reset` and `db:wipe` wrap `prisma migrate reset --skip-seed`: drop every table, recreate the schema from `apps/server/prisma/migrations/`, leave the database empty. The admin bootstrap service then re-creates the default admin from `DEFAULT_ADMIN_*` on the next API start — use `pnpm app:install --force` instead if you want to pick a fresh admin email/password.

---

## 🧪 Testing

```bash
pnpm --filter @open-meet/server test            # Vitest — services · repositories · guards
pnpm --filter @open-meet/e2e install:browsers   # one-time Playwright deps
pnpm --filter @open-meet/e2e test               # unit + browser e2e
pnpm --filter @open-meet/e2e screenshots        # regenerate docs/screenshots/*
```

---

<div align="center">
<sub>Made with ❤️ in TypeScript · MIT licensed</sub>
</div>
