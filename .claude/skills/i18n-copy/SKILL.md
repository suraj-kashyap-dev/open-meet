---
name: i18n-copy
description: Use whenever adding or changing user-facing UI or API copy. open-meet ships 15 locales; this skill keeps every locale in lockstep and registers new namespaces so useTranslations doesn't throw at runtime.
---

# i18n copy changes

15 locales under `apps/{web,admin,server}/lang/<locale>/`. **English is the source of truth.**

## Steps

1. Add/update the key in the **English** namespace file first (`lang/en/<ns>.json`).
2. Mirror the exact same key structure into **every** other locale file in that namespace. Delegate bulk per-locale translation to parallel subagents rather than editing 14 files inline.
3. If you created a **new namespace** (`lang/<locale>/<ns>.json`), register it in `i18n/request.ts` `NAMESPACES` — otherwise `useTranslations('<ns>')` throws at runtime, and `i18n:verify` will **not** catch it.
4. Never hardcode user-facing strings in components; use `next-intl` (`apps/{web,admin}`) / `nestjs-i18n` (server).
5. Preserve RTL (Arabic) and locale-prefixed routing.

Locales: `en` (base) · `ar` (RTL) · `es` · `pt` · `fr` · `de` · `it` · `ru` · `tr` · `zh` · `ja` · `ko` · `id` · `hi` · `bn`.

## Validate

```
pnpm i18n:verify
```

Run it after every copy change — it keeps locales aligned (but does not check namespace registration; see step 3).
