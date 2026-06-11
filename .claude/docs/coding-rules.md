# Coding Rules

## TypeScript Rules

- Keep compatibility with the repo's strict TypeScript setup.
- Do not introduce `any` where existing code expects typed DTOs, query results, or props.
- Prefer `import type` for type-only imports unless Nest runtime metadata requires value imports.
- Respect the current ESLint rules:
  - no unused variables unless prefixed with `_`
  - no explicit `any`
  - consistent type imports
  - `console` limited to `warn`, `error`, and `info`
- Match current Prettier settings:
  - single quotes
  - semicolons
  - trailing commas
  - `printWidth: 100`

## Code Formatting Style

Write code in the repo's spacious style. Do this for new code and when editing existing files:

- Always brace guard clauses; never use single-line `if` returns.
  - Wrong: `if (!el) return;`
  - Right:
    ```ts
    if (!el) {
      return;
    }
    ```
- Separate sequential statements inside a function/effect body with blank lines for breathing room — after a leading `const`, before a `return`, and between consecutive assignments or calls. Do not pack statements together.
- Group `useEffect`/`useLayoutEffect` blocks together rather than interleaving them between variable declarations.

## Naming Conventions

- Files and folders are predominantly kebab-case.
- React components export PascalCase symbols.
- Hooks begin with `use`.
- Nest DTO classes end in `Dto` or `ApiDto`.
- Nest modules/services/controllers/repositories follow feature-based names such as `MeetingsController`, `AdminAccountsService`, or `BrandingRepository`.
- Query keys are stable array literals declared near their related hooks.

## Component Conventions

- Default to Server Components in Next apps.
- Add `'use client'` only when state, effects, browser APIs, or client-only hooks are required.
- Put shared UI primitives in `packages/ui`.
- Put feature-specific UI under `features/.../components`.
- Reuse `@open-meet/ui` before creating new base-level buttons, dialogs, inputs, tables, or layout primitives.
- Use existing Tailwind tokens and utilities instead of introducing parallel design primitives.
- Preserve current provider/layout wiring in the locale root layouts.

## Backend Service / Controller / Module Conventions

- Controllers should parse inputs and delegate immediately to services.
- Services should hold business logic, orchestration, and DTO mapping.
- Repositories should own Prisma queries.
- Do not inject `PrismaService` directly into controllers.
- Keep server feature code under `src/modules/client/*` or `src/modules/admin/*`.
- Put shared backend behavior in `src/common/*`.
- Keep decorators, guards, and strategies near the auth/RBAC areas that use them.

## Error Handling Rules

- Throw Nest HTTP exceptions instead of raw objects.
- Include repo-defined API error codes when raising domain errors.
- Let `GlobalExceptionFilter` produce the final error envelope.
- Let `TransformInterceptor` produce the success envelope for JSON responses.
- Use `@SkipTransform()` only for endpoints that intentionally return raw/streamed responses.
- On frontend clients, surface failures through `ApiClientError` and existing toast patterns.

## Validation Rules

- Backend HTTP DTOs should use `class-validator` decorators and the global `ValidationPipe`.
- Frontend forms should use Zod schemas plus `zodResolver`.
- Environment validation belongs in `packages/config/src/env.ts`.
- Use `ZodValidationPipe` only when the input is naturally modeled as a zod schema.
- Keep frontend validation limits aligned with backend DTO constraints when the same field appears in both places.

## API Response Rules

- Successful JSON responses should conform to the shared `ApiSuccess<T>` envelope.
- Error responses should conform to the shared `ApiError` shape.
- Browser HTTP calls should go through the per-app typed API clients in `apps/{web,admin}/lib/api/client.ts`.
- Keep `credentials: 'include'` for cookie-authenticated requests.
- Preserve the existing `x-locale` header behavior for localized API responses.
- Use multipart/FormData only for endpoints that already expect file uploads.

## Styling / UI Rules

- Use Tailwind CSS v4 utilities and the existing tokenized class names.
- Shared variants should use existing helpers such as `cn` and `class-variance-authority`.
- Preserve branding/accent behavior instead of hard-coding one-off colors.
- Reuse the existing `sonner` toaster pattern for notifications.
- Keep locale-aware and RTL-aware rendering intact.

## Import / Export Rules

- Inside apps, prefer `@/` imports over long relative paths.
- Across workspaces, use `@open-meet/*` package imports.
- Reuse existing public exports instead of reaching into package internals unless that path is already part of the package exports.
- Prefer named exports for reusable hooks, components, and utilities to match current patterns.
- Keep Nest runtime classes imported as values when decorators or DI metadata depend on them.
