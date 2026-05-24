# Contributing to Open Meet

Thanks for contributing to Open Meet. This repository is a full-stack TypeScript monorepo for a self-hostable video conferencing platform, so even small changes can affect web, admin, API, realtime, and infrastructure behavior together.

## Before you start

- Check the existing issues, pull requests, and [README](README.md) first.
- Open an issue before starting large features, architecture changes, or broad refactors.
- Use the security process in [SECURITY.md](SECURITY.md) instead of a public issue for vulnerabilities.
- Keep contributions focused. Separate unrelated fixes into separate pull requests.

## Development setup

### Prerequisites

- Node.js 22 LTS recommended
- `pnpm` 9 or newer
- Docker Desktop or compatible Docker Engine

### Boot the project

```bash
./setup.sh
pnpm dev
```

`setup.sh` generates local environment files, starts required containers, and runs database setup. Read [README.md](README.md) for service URLs, flags, and reset commands.

## Repository layout

- `apps/web` - public meeting application
- `apps/admin` - admin console
- `apps/server` - NestJS API, auth, meeting, and realtime backend
- `packages/types` - shared DTOs and contracts
- `packages/ui`, `packages/utils`, `packages/config` - shared frontend and backend utilities

## Development guidelines

- Prefer the smallest change that solves the problem cleanly.
- Preserve shared contracts. If an API payload or socket event changes, update the shared types and all affected consumers.
- Add or update tests when behavior changes, especially in `apps/server` and shared packages.
- Update documentation when setup, configuration, or user-visible behavior changes.
- Do not commit secrets, generated `.env` files, build output, or local uploads.
- Use English as the source locale. If you change user-facing copy, update the English strings first and run `pnpm i18n:verify`.
- If a change affects auth, admin access, file uploads, meeting permissions, or token handling, call that out clearly in the pull request.

## Quality checks

Run the checks relevant to your change before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm i18n:verify
pnpm --filter @open-meet/server test:e2e
```

Notes:

- `pnpm --filter @open-meet/server test:e2e` is especially important for API and auth changes.
- UI changes should include screenshots or a short recording in the pull request when practical.
- Schema or environment changes should include the required Prisma migration or `.env.example` updates.

## Pull request expectations

- Use a clear title and describe the problem being solved.
- Link the related issue when one exists.
- Include manual test steps for flows that are hard to cover automatically.
- Mention any breaking changes, new environment variables, migrations, or security-sensitive behavior.
- Keep PRs reviewable. Large drive-by cleanup mixed with feature work is likely to be sent back for splitting.

## Communication

Be respectful and constructive in issues, discussions, and reviews. By participating in this project, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing to Open Meet, you agree that your contributions will be licensed under the [MIT License](LICENSE).
