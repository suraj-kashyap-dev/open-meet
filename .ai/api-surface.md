# API Surface

## Base Rules

- HTTP base prefix: `/api`
- Success responses are usually wrapped into `{ success: true, data, meta }`
- Error responses are usually wrapped into `{ success: false, error }`
- Public endpoints are marked with `@Public()`

## Public And Shared Endpoints

### Config

- `GET /api/config/public`
  - public branding/config consumed by web and admin SSR

### LiveKit

- `POST /api/livekit/webhook`
  - LiveKit server webhook receiver

### Upload Serving

- `GET /api/uploads/public/*`
  - public file serving for stored assets

## User Auth

Controller: `apps/server/src/modules/client/auth/auth.controller.ts`

- `GET /api/auth/invite/:token`
- `POST /api/auth/invite/accept`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/google/status`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/auth/me/password`
- `POST /api/auth/me/avatar`
- `DELETE /api/auth/me/avatar`

Public self-registration endpoint:

- `Not detected yet in the active controller routes`

## Meetings

Controller: `apps/server/src/modules/client/meetings/meetings.controller.ts`

- `POST /api/meetings`
- `POST /api/meetings/schedule`
- `GET /api/meetings/upcoming`
- `GET /api/meetings/history`
- `GET /api/meetings/:code`
- `POST /api/meetings/:code/guest-session`
- `PATCH /api/meetings/:code`
- `POST /api/meetings/:code/join`
- `POST /api/meetings/:code/leave`
- `POST /api/meetings/:code/end`
- `GET /api/meetings/:code/participants`
- `GET /api/meetings/:code/ics`

Meeting chat history controller:

- `GET /api/meetings/:code/messages`

## LiveKit Token Issuance

Controller: `apps/server/src/integrations/livekit/livekit.controller.ts`

- `POST /api/livekit/token`

## Persistent Messaging

### Conversations

Controller: `apps/server/src/modules/client/messaging/conversations.controller.ts`

- `GET /api/messaging/activity`
- `GET /api/messaging/conversations`
- `POST /api/messaging/conversations/direct`
- `GET /api/messaging/unread`
- `GET /api/messaging/saved`
- `GET /api/messaging/gifs`
- `GET /api/messaging/presence/me`
- `PATCH /api/messaging/conversations/:id/state`
- `GET /api/messaging/conversations/:id/pins`
- `GET /api/messaging/conversations/:id`
- `GET /api/messaging/conversations/:id/messages`
- `POST /api/messaging/conversations/:id/messages`
- `POST /api/messaging/conversations/:id/read`
- `POST /api/messaging/conversations/:id/polls`

### Message-Level Actions

Controller: `apps/server/src/modules/client/messaging/messages.controller.ts`

- `PATCH /api/messaging/messages/:id`
- `DELETE /api/messaging/messages/:id`
- `POST /api/messaging/messages/:id/forward`
- `POST /api/messaging/messages/:id/reactions`
- `DELETE /api/messaging/messages/:id/reactions/:emoji`
- `POST /api/messaging/messages/:id/pin`
- `DELETE /api/messaging/messages/:id/pin`
- `POST /api/messaging/messages/:id/save`
- `DELETE /api/messaging/messages/:id/save`

### Groups

Controller: `apps/server/src/modules/client/messaging/groups.controller.ts`

Detected group-management routes include:

- `POST /api/messaging/groups`
- `PATCH /api/messaging/groups/:id`
- `POST /api/messaging/groups/:id/members`
- `DELETE /api/messaging/groups/:id/members/:userId`
- `POST /api/messaging/groups/:id/members/:userId/role`
- additional route details should be confirmed from the controller before editing

### Polls

Controller: `apps/server/src/modules/client/messaging/polls.controller.ts`

- poll voting/closing endpoints are present
- exact full list should be confirmed from the controller before editing

### Teammates

Controller: `apps/server/src/modules/client/messaging/teammates.controller.ts`

- teammate lookup endpoints are present
- exact full list should be confirmed from the controller before editing

## Settings

Controller: `apps/server/src/modules/client/settings/settings.controller.ts`

- user settings endpoints are present
- exact full list should be confirmed from the controller before editing

## Recording

Controller: `apps/server/src/modules/client/recording/recording.controller.ts`

- recording lifecycle endpoints are present
- exact full list should be confirmed from the controller before editing

## Uploads

Controller: `apps/server/src/modules/uploads/uploads.controller.ts`

- `POST /api/uploads`
- `GET /api/uploads/public/*`

## Admin Auth

Controller: `apps/server/src/modules/admin/auth/auth.controller.ts`

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`
- `PATCH /api/admin/auth/me`
- `PATCH /api/admin/auth/me/password`
- `POST /api/admin/auth/me/avatar`
- `DELETE /api/admin/auth/me/avatar`

## Admin Accounts

Controller: `apps/server/src/modules/admin/accounts/accounts.controller.ts`

- admin account CRUD endpoints are present under `/api/admin/accounts`
- invite endpoints are split with a dedicated controller

Invite controller: `apps/server/src/modules/admin/accounts/invite.controller.ts`

- invite lookup/accept/list/create/resend/revoke endpoints are present under admin account routes
- confirm exact paths from the controller before changing them

## Admin Users

Controller: `apps/server/src/modules/admin/users/users.controller.ts`

- `GET /api/admin/users`
- `GET /api/admin/users/invites`
- `POST /api/admin/users`
- `POST /api/admin/users/invite`
- `POST /api/admin/users/invites/:id/resend`
- `DELETE /api/admin/users/invites/:id`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/users/:id/avatar`
- `DELETE /api/admin/users/:id/avatar`

## Admin Teams

Controller: `apps/server/src/modules/admin/teams/teams.controller.ts`

- `GET /api/admin/teams`
- `POST /api/admin/teams`
- `GET /api/admin/teams/:id`
- `PATCH /api/admin/teams/:id`
- `DELETE /api/admin/teams/:id`
- `POST /api/admin/teams/:id/members`
- `DELETE /api/admin/teams/:id/members/:userId`

## Admin Groups

Controller: `apps/server/src/modules/admin/groups/groups.controller.ts`

- `GET /api/admin/groups`
- `POST /api/admin/groups`
- `GET /api/admin/groups/:id`
- `PATCH /api/admin/groups/:id`
- `POST /api/admin/groups/:id/members`
- `DELETE /api/admin/groups/:id/members/:userId`
- `DELETE /api/admin/groups/:id`

## Admin Meetings

Controller: `apps/server/src/modules/admin/meetings/meetings.controller.ts`

- `GET /api/admin/meetings`
- `POST /api/admin/meetings/end-all-active`
- `GET /api/admin/meetings/:id`
- `POST /api/admin/meetings/:id/end`
- `DELETE /api/admin/meetings/:id`
- `POST /api/admin/meetings/:id/participants/:userId/kick`

## Admin RBAC

### Permissions

Controller: `apps/server/src/modules/admin/rbac/admin-permissions.controller.ts`

- `GET /api/admin/permissions/catalog`

### Roles

Controller: `apps/server/src/modules/admin/rbac/admin-roles.controller.ts`

- `GET /api/admin/roles`
- `GET /api/admin/roles/:id`
- `POST /api/admin/roles`
- `PATCH /api/admin/roles/:id`
- `DELETE /api/admin/roles/:id`

## Admin Branding / Configuration / Analytics

Detected controllers:

- `apps/server/src/modules/admin/branding/branding.controller.ts`
- `apps/server/src/modules/admin/configuration/configuration.controller.ts`
- `apps/server/src/modules/admin/analytics/analytics.controller.ts`

These admin settings/analytics endpoints are present under `/api/admin/*`. Confirm exact route details from the controller before changing them.

## WebSocket Namespaces

Shared contracts: `packages/types/src/socket.ts`

### Meeting Namespace

- namespace: `/meeting`
- used for:
  - join/leave
  - lobby knocking
  - meeting chat
  - reactions
  - raise hand/lower hand

### Persistent Chat Namespace

- namespace: `/chat`
- used for:
  - conversation join/leave
  - message send/edit/delete
  - reactions
  - typing
  - read receipts
  - presence
  - poll updates
  - pin updates
