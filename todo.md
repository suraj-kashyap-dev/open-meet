# TODO

Backlog of high-confidence unimplemented or partially implemented features found in the current app audit. These are features that already exist in DTOs, settings forms, public config, or translations, but are not fully enforced or surfaced in runtime behavior yet.

## P0: Workspace meeting policy

- [ ] Enforce `allowGuestJoin` in the meeting join flow.
  Notes: the setting exists in `apps/admin/features/configuration/components/configuration-form.tsx` and is persisted by `apps/server/src/modules/config/workspace-config.service.ts`, but the current join path in `apps/server/src/modules/client/meetings/meetings.service.ts` does not appear to honor a guest-access policy.

- [ ] Apply `defaultMeetingTitle` when instant and scheduled meetings are created without a title.
  Notes: the workspace default exists and is editable, but `MeetingsService.create()` currently accepts `title` directly instead of resolving a workspace default when blank.

- [ ] Enforce `maxMeetingMinutes`.
  Notes: the admin setting exists and is saved, but no runtime validation, auto-end logic, or scheduling limit was found in the meeting lifecycle.

- [ ] Implement real recurring meeting series support.
  Notes: `recurrence` is stored and displayed, and it is included in ICS export, but there is no clear series/occurrence management yet. Missing pieces likely include generated occurrences, edit-this-occurrence vs edit-series, skip/cancel one occurrence, and next-run handling.

## P1: Messaging and user preference gaps

- [ ] Honor `allowDirectMessages` in the messaging permission layer.
  Notes: the user preference exists in `apps/web/features/web/account/components/privacy-settings.tsx` and is stored by `apps/server/src/modules/client/settings/settings.service.ts`, but `apps/server/src/modules/client/messaging/chat-permissions.service.ts` only checks `chatDisabled` and teammate rules.

- [ ] Apply `defaultView` when a user enters a meeting.
  Notes: the preference is exposed in `apps/web/features/web/account/components/meeting-preferences.tsx`, but no clear consumer was found in the meeting room state/UI to choose gallery vs speaker as the initial layout.

- [ ] Implement a real consent-backed flow for `shareUsageData`, or remove the setting until telemetry exists.
  Notes: the toggle is stored in user settings, but no analytics or telemetry path was found using it.

- [ ] Add a frontend surface for peer public profiles.
  Notes: the server exposes public user profile data via `apps/server/src/modules/client/auth/users.controller.ts`, but there is no obvious participant profile drawer/page consuming it in web or admin.

## P1: Admin branding and workspace controls

- [ ] Expose workspace `accentColor` in the admin branding UI.
  Notes: backend support exists in `apps/server/src/modules/admin/branding`, and the web app already consumes public accent config via branding/theme providers, but the current form in `apps/admin/features/branding/components/branding-form.tsx` only manages app name and logo.

- [ ] Expose `userCanCreateGroups` in admin UI.
  Notes: backend support exists, and the web chat UI already respects the flag when showing group creation, but there is no visible admin control wired in the current branding/settings form.

## P2: Follow-up

- [ ] Review whether the unused `coming-soon` components should back planned pages or be removed.
  Notes: `apps/admin/components/shared/coming-soon.tsx` and `apps/web/components/web/coming-soon/coming-soon.tsx` exist, but no active page usage was found during this audit.

## Not part of this backlog

These areas looked implemented enough that they should not be treated as missing features without a separate bug report:

- Recordings and meeting history
- Join sound preference
- Browser notification preference
- Profile visibility and email visibility controls
