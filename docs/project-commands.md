# Project Commands

## Prerequisites

- Recommended by the repo README: Node `22` LTS
- Minimum declared in root `package.json`: Node `>=20`, pnpm `>=9`
- Package manager pinned in the repo: pnpm `10.16.0`

## Install / Bootstrap

- `pnpm install`
  - install all workspace dependencies
- `./setup.sh`
  - bootstrap env files, install dependencies, start infrastructure, and prepare the database
- `pnpm setup`
  - script alias for `./setup.sh`

Useful `setup.sh` flags detected in the script and README:

- `./setup.sh --force`
- `./setup.sh --skip-install`
- `./setup.sh --skip-docker`
- `./setup.sh --skip-db`

## Development Commands

- `pnpm dev`
  - run the monorepo dev pipeline
- `pnpm start`
  - start built apps filtered to `./apps/*`
- `pnpm --filter @open-meet/web dev`
- `pnpm --filter @open-meet/admin dev`
- `pnpm --filter @open-meet/server dev`

## Build Commands

- `pnpm build`
- `pnpm --filter @open-meet/web build`
- `pnpm --filter @open-meet/admin build`
- `pnpm --filter @open-meet/server build`
- `pnpm --filter @open-meet/config build`
- `pnpm --filter @open-meet/types build`
- `pnpm --filter @open-meet/utils build`

## Lint / Typecheck / Format Commands

- `pnpm lint`
- `pnpm lint:fix`
- `pnpm typecheck`
- `pnpm format`
- `pnpm format:check`
- `pnpm i18n:verify`

Filtered examples:

- `pnpm --filter @open-meet/web lint`
- `pnpm --filter @open-meet/admin lint`
- `pnpm --filter @open-meet/server lint`
- `pnpm --filter @open-meet/web typecheck`
- `pnpm --filter @open-meet/admin typecheck`
- `pnpm --filter @open-meet/server typecheck`

## Test Commands

### Workspace

- `pnpm test`

### Server

- `pnpm --filter @open-meet/server test`
- `pnpm --filter @open-meet/server test:watch`
- `pnpm --filter @open-meet/server test:e2e`

### Web

- `pnpm --filter @open-meet/web test`
- `pnpm --filter @open-meet/web test:watch`
- `pnpm --filter @open-meet/web test:e2e`
- `pnpm --filter @open-meet/web test:e2e:ui`
- `pnpm --filter @open-meet/web test:e2e:report`

### Admin

- `pnpm --filter @open-meet/admin test`
- `pnpm --filter @open-meet/admin test:watch`
- `pnpm --filter @open-meet/admin test:e2e`
- `pnpm --filter @open-meet/admin test:e2e:ui`
- `pnpm --filter @open-meet/admin test:e2e:report`

### Shared Packages With Tests

- `pnpm --filter @open-meet/types test`
- `pnpm --filter @open-meet/utils test`

## Database Commands

- `pnpm db:reset`
  - interactive Prisma reset through the server workspace
- `pnpm db:wipe`
  - non-interactive Prisma reset through the server workspace
- `pnpm db:studio`
  - open Prisma Studio
- `pnpm --filter @open-meet/server prisma:generate`
- `pnpm --filter @open-meet/server prisma:migrate`
- `pnpm --filter @open-meet/server prisma:studio`
- `pnpm --filter @open-meet/server prisma:reset`

Database seed command:

- `Not detected yet`

## Docker / Infrastructure Commands

Detected infrastructure file:

- `docker-compose.yml`

Useful commands:

- `docker compose up -d`
- `docker compose down`
- `docker compose ps`
- `docker compose logs -f`
- `docker compose logs -f livekit`
- `docker compose logs -f postgres redis`

Detected services:

- `postgres`
- `adminer`
- `redis`
- `livekit`
- `livekit-egress`
- `coturn`
- `mailhog`

Dockerfile for app image builds:

- `Not detected yet`
