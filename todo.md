# open-meet — Mobile App (React Native / Expo) — Plan + TODO

> **Decision:** Build the mobile app as **`apps/mobile`** using **Expo (React Native)** with **EAS development builds**.
> Rationale: the whole codebase is TypeScript + React + LiveKit, so RN reuses the language, the libraries, and the shared workspace packages. Flutter (Dart) would reuse none of it.
> Target Expo SDK that ships **React 19** (SDK 53+) to stay aligned with `apps/web` (React 19).

---

## 0. Ground truth (verified against the repo)

- Monorepo: pnpm workspaces (`apps/*`, `packages/*`) + Turborepo. New app drops in as `apps/mobile`.
- **Reusable as-is:** `@open-meet/types` (`api.ts`, `socket.ts`, `dto/`), `@open-meet/utils` (`code.ts`, `duration.ts`, `ics.ts`, `validation.ts`), `@open-meet/config` (`env.ts` zod schemas).
- **NOT reusable:** `@open-meet/ui` (DOM/shadcn/Radix) and `@open-meet/tailwind-config` PostCSS pipeline — mobile needs its own RN UI layer.
- **Auth is half-done for us:** `jwt.strategy.ts` already extracts the access token from cookie **then** `Authorization: Bearer`. Web client lives in `apps/web/lib/api/client.ts` (cookie-based, `credentials: 'include'`). Google OAuth exists (`google-oauth.service.ts`).
- Web versions to match: `livekit-client ^2.8.1`, `socket.io-client ^4.8.1`, `@tanstack/react-query ^5.65`, `zustand ^5.0.3`, `react-hook-form ^7.54`, `zod ^3.24`, `lucide` icons.

---

## ✅ POSITIVE PLAN — phased implementation

### Phase 1 — Workspace scaffold
- [ ] `npx create-expo-app apps/mobile` (TypeScript template), pin Expo SDK that bundles React 19.
- [ ] Add `apps/mobile` to pnpm workspace (already globbed by `apps/*` — just verify install resolves).
- [ ] Configure Metro to resolve the monorepo: `watchFolders` = repo root, `nodeModulesPaths` for hoisted + app-local deps, `disableHierarchicalLookup` off. Use Expo's `getDefaultConfig` + monorepo recipe.
- [ ] Wire Turborepo tasks: add `dev`, `lint`, `typecheck`, `build` scripts to `apps/mobile/package.json` so `turbo` picks it up.
- [ ] `strict: true` + `noUncheckedIndexedAccess: true` tsconfig extending `@open-meet/typescript-config`.

### Phase 2 — Shared-package wiring
- [ ] Add `@open-meet/types`, `@open-meet/utils`, `@open-meet/config` as `workspace:*` deps.
- [ ] Confirm Metro transpiles workspace packages (add to `transformer`/`resolver` if shipped as TS source, like web does via `transpilePackages`).
- [ ] Smoke test: import a socket event name from `@open-meet/types` and a util from `@open-meet/utils` in `App`.

### Phase 3 — UI / theming foundation
- [ ] Install **NativeWind v4** + `tailwindcss`; share design tokens (colors/spacing) from `@open-meet/tailwind-config` values (copy tokens, not the PostCSS config).
- [ ] Add **react-native-reusables** (shadcn-style RN primitives) for buttons/inputs/dialogs/sheets.
- [ ] `lucide-react-native` for icons (1:1 with web's `lucide-react`).
- [ ] `react-native-reanimated` (+ `moti` if a framer-motion-like API is wanted to mirror `motion`).
- [ ] Dark mode + theme provider parity with web.

### Phase 4 — API client + auth (highest-risk; do carefully)
- [ ] Port `apps/web/lib/api/client.ts` → `apps/mobile/lib/api/client.ts`, reusing `ApiResponse`/`ApiError` from `@open-meet/types` and the same envelope unwrapping.
- [ ] Replace cookie auth with **`Authorization: Bearer`** (access token already accepted by `jwt.strategy.ts`).
- [ ] Store tokens in **`expo-secure-store`** (Keychain/Keystore) — never AsyncStorage, never plaintext.
- [ ] **Backend change:** add a mobile-friendly refresh path — accept the refresh token from request body/header (not only cookie) and return rotated tokens in the JSON body. Keep refresh rotation + Redis hash invalidation intact. Add `.env.example` entries if any new var.
- [ ] Auto-refresh interceptor in the client (retry once on 401 → refresh → replay).
- [ ] Google OAuth via **`expo-auth-session` / `expo-web-browser`** with a deep-link redirect; exchange code with backend.
- [ ] Forms with **react-hook-form + zod**, reusing zod schemas from shared packages where present.

### Phase 5 — i18n (en + ar, RTL)
- [ ] Use **FormatJS / `react-intl`** (or LinguiJS) — speaks the same ICU MessageFormat as `next-intl`.
- [ ] **Reuse the actual message JSON** from `apps/web/lang/<locale>/*.json` (en source of truth, ar mirror). Decide: import shared files vs. a build step that copies them.
- [ ] Locale detection via `expo-localization`; RTL via `I18nManager` (Arabic).
- [ ] Add mobile to the `pnpm i18n:verify` discipline (same keys/order, only values differ).

### Phase 6 — Navigation + core screens
- [ ] **Expo Router** (file-based, mirrors Next.js App Router mental model).
- [ ] Auth stack: sign in / sign up / Google.
- [ ] Home: join-by-code + create meeting (reuse `@open-meet/utils` code gen/validation).
- [ ] Pre-join lobby: camera/mic preview + device pick + permissions prompt.
- [ ] TanStack Query for all server state (no `useEffect` fetching).
- [ ] Zustand stores — port logic from `apps/web/stores/` where shareable.

### Phase 7 — LiveKit (the core feature)
- [ ] Install `@livekit/react-native`, `@livekit/react-native-webrtc`, `@livekit/react-native-expo-plugin`.
- [ ] Register the LiveKit Expo config plugin + `expo-build-properties`; **switch to EAS dev builds** (WebRTC native module → Expo Go won't work).
- [ ] iOS/Android permissions: camera, microphone, (screen share later). Background audio mode on iOS.
- [ ] Token fetch from existing backend endpoint (room-scoped, 4h TTL); identity = userId.
- [ ] Room screen: participant grid, active speaker, mute/camera toggle, leave.
- [ ] Reconnection handling + network-change behavior.

### Phase 8 — Realtime chat + reactions
- [ ] `socket.io-client` v4, namespace `/meeting`, JWT on connect (bearer in auth payload — `WsJwtGuard` runs on connection).
- [ ] **Event names imported from `@open-meet/types/socket.ts`** — never inline strings.
- [ ] Chat UI, reactions, presence.

### Phase 9 — Push + native call UX
- [ ] `expo-notifications` for meeting invites/reminders (server push integration later).
- [ ] CallKit (iOS) / ConnectionService (Android) for proper incoming-call UX — defer to a polish milestone.

### Phase 10 — Testing
- [ ] Vitest unit tests for client logic (api client, auth refresh, stores, utils) under `apps/mobile/test/unit/**` mirroring `src/`.
- [ ] React Native Testing Library for components with non-trivial logic.
- [ ] Behavioral naming: `describe('method()')` + `it('should … when …')`.
- [ ] Detox or Maestro for a couple of critical e2e flows (sign-in, join room) — optional milestone.

### Phase 11 — Build / release
- [ ] EAS Build profiles (development / preview / production) + EAS Submit.
- [ ] App icons, splash, deep-link scheme, store metadata.
- [ ] CI: typecheck + lint + unit on PR; gate alongside existing `i18n.yml`.

---

## ⛔ NEGATIVE PLAN — mistakes to actively avoid

### Architecture
- [ ] **DON'T try to reuse `@open-meet/ui`** in RN. It's DOM/Radix — it will not render. Build a parallel RN UI layer; share only tokens/types/logic.
- [ ] **DON'T pin `react` to an exact version** (`19.0.0`) in shared packages. Keep it a peer/range so the Expo SDK's React build can satisfy it — pinning causes duplicate-React crashes ("Invalid hook call").
- [ ] **DON'T put business logic in screens/components.** Mirror the web discipline: server state → TanStack Query, client state → Zustand, API → the typed client.
- [ ] **DON'T fetch data in `useEffect`.** Same rule as web — TanStack Query only.

### Auth & security
- [ ] **DON'T store tokens in AsyncStorage or Zustand-persist-to-disk.** Use `expo-secure-store` (Keychain/Keystore) only.
- [ ] **DON'T try to replicate httpOnly cookies on mobile** — that model is browser-specific. Use bearer tokens (already supported by `jwt.strategy.ts`) + a JSON refresh path.
- [ ] **DON'T break refresh-token rotation** when adding the mobile refresh path. The old refresh must still be invalidated in Redis on use; just change the transport (body/header), not the security model.
- [ ] **DON'T loosen CORS or add wildcards** to accommodate mobile. Native apps don't send `Origin`; no CORS change is needed. If anything is needed it's the bearer/refresh path, not CORS.
- [ ] **DON'T log tokens** or PII to console/crash reporters.

### LiveKit / native
- [ ] **DON'T expect Expo Go to work** once WebRTC is added. Plan for EAS dev builds from Phase 7 — discovering this late blocks everyone.
- [ ] **DON'T forget iOS background audio mode** and runtime permission prompts — missing them = silent failures / store rejection.
- [ ] **DON'T hardcode the LiveKit URL/token**; fetch room-scoped 4h tokens from the existing backend, same as web.
- [ ] **DON'T skip reconnection/network-change handling** — mobile networks flap constantly; untested reconnection is the #1 mobile-call complaint.

### Realtime
- [ ] **DON'T inline socket event strings.** Import from `@open-meet/types/socket.ts` so server and clients stay in lockstep.
- [ ] **DON'T assume the socket survives app backgrounding.** Handle disconnect/resume on `AppState` changes.

### i18n
- [ ] **DON'T fork the translation strings.** Reuse the en/ar JSON; keep mobile under `pnpm i18n:verify` so locales stay mirrored (same keys/order, only values differ — en first, then mirror).
- [ ] **DON'T forget RTL.** Test Arabic with `I18nManager` early; retrofitting RTL is painful.

### Monorepo / tooling
- [ ] **DON'T skip Metro monorepo config.** Default Metro won't resolve hoisted workspace deps → "unable to resolve module" hell. Configure `watchFolders` + `nodeModulesPaths` up front.
- [ ] **DON'T let the mobile app fall out of `turbo`/CI.** Add its `lint`/`typecheck`/`test` tasks so it's gated like the other apps.
- [ ] **DON'T introduce a new env var without adding it to the matching `.env.example` first** (repo rule).

### Process
- [ ] **DON'T ship a feature or bug fix without tests** (repo's non-negotiable rule applies to mobile too).
- [ ] **DON'T add a `Co-Authored-By: Claude` trailer** to commits in this repo.

---

## Definition of done (per milestone)
- [ ] `pnpm typecheck` + `pnpm lint` clean across the workspace (mobile included).
- [ ] `pnpm i18n:verify` passes with mobile locales mirrored.
- [ ] Unit tests pass for new client logic.
- [ ] A real EAS dev build joins a LiveKit room and exchanges chat on a physical device (iOS + Android).
