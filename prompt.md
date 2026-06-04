Implement this feature in the existing `open-meet` monorepo at:

`/home/suraj/Desktop/open-meet`

Goal:
Implement a team-restricted corporate chat system where users can DM only users in their own team by default. If a user wants to contact someone outside their team, they must submit a chat request. An admin/manager reviews the request and can approve or reject it. Once approved, the pair can chat normally going forward.

Important repo facts you must respect:

- Backend: NestJS + Prisma
- Web app: Next.js in `apps/web`
- Admin app: Next.js in `apps/admin`
- Persistent chat lives in:
  - `apps/server/src/modules/client/messaging`
  - `apps/web/features/web/chat`
- Meeting-scoped chat / LiveKit is separate and must not be broken
- Admin accounts and end users are separate models/tables
- Teams already exist in Prisma and admin UI:
  - `apps/server/prisma/schema/messaging.prisma`
  - `apps/server/src/modules/admin/teams/*`
  - `apps/admin/features/teams/*`
- There is already a local modification in:
  - `apps/server/src/modules/client/messaging/chat-permissions.service.ts`
    Do not revert unrelated changes.

Interpretation to use in this repo:

- “Manager” means an admin-panel user, not a normal chat user.
- Reuse the existing Admin RBAC system.
- Do not invent an Organization model.
- Do not replace the existing chat architecture. Extend it minimally and coherently.

First inspect these areas before changing code:

- `apps/server/src/modules/client/messaging/chat-permissions.service.ts`
- `apps/server/src/modules/client/messaging/chat-permissions.repository.ts`
- `apps/server/src/modules/client/messaging/conversations.service.ts`
- `apps/server/src/modules/client/messaging/messages.service.ts`
- `apps/server/src/modules/client/messaging/groups.service.ts`
- `apps/server/src/modules/client/messaging/conversation.gateway.ts`
- `apps/server/src/modules/client/messaging/teammates.repository.ts`
- `apps/server/src/modules/client/messaging/teammates.service.ts`
- `apps/server/prisma/schema/messaging.prisma`
- `apps/server/prisma/schema/admin.prisma`
- `apps/server/src/modules/admin/teams/*`
- `apps/web/features/web/chat/*`
- `apps/admin/features/*`
- `packages/types/src/dto/*`
- `packages/types/src/permissions/*`

Feature requirements

1. Extend existing Team model instead of recreating it

- The repo already has `Team` and `TeamMember`.
- Extend `Team` minimally to support controlled ownership/management:
  - keep existing fields
  - add `description` nullable
  - add `managerAdminId` nullable or required if migration-safe, referencing `Admin`
- Do not add `organizationId`
- Keep support for multiple team membership

2. Team management rules

- Admins with appropriate RBAC permissions can create/update/delete teams
- A team should have an owning/assigned manager admin (`managerAdminId`)
- Admins can manage all teams if their existing permissions allow it
- A manager admin should only manage teams they own, unless their role grants broader access
- Reuse existing `/api/admin/teams` routes instead of creating generic `/teams` routes
- Extend existing admin UI instead of adding a parallel team system

3. Team membership rules

- Reuse existing `TeamMember`
- Preserve unique membership per `(teamId, userId)`
- Add/remove users through the existing admin teams flow
- If needed, extend team DTOs/forms to include description and manager selection
- Do not add a fake “MANAGER” chat user role unless absolutely necessary; management authority should come from the `Admin` side

4. Direct chat permission rules
   Before creating or opening a direct conversation:

- Allow if both users share at least one team
- Allow if there is an approved cross-team chat permission for that pair
- Allow if the acting user is an admin with full override authority, if that path already exists and is appropriate
- Otherwise do not create/open the DM directly
- Instead, expose a request flow that creates a pending chat request

Apply the same protection not only to “open direct conversation” but also to:

- sending messages in direct conversations
- fetching direct conversation details/messages if needed to avoid unauthorized legacy access

Backend checks must be authoritative. Do not rely on frontend restrictions.

5. Chat request model
   Add a persistent model for cross-team DM approval, for example `ChatContactRequest`, with:

- id
- requestedById -> User
- requestedToId -> User
- status: `PENDING | APPROVED | REJECTED | BLOCKED | CANCELLED`
- reason nullable
- reviewedByAdminId nullable -> Admin
- reviewedAt nullable
- createdAt
- updatedAt

Rules:

- Prevent self-request
- Prevent duplicate pending request for the same unordered pair
- If an approved permission already exists, do not create a request
- Admin/manager can review requests only when they are allowed to review at least one side of the team relationship
- Admin with broad permissions can review any request

6. Approved pair permission model
   Add a persistent model for approved cross-team chat access, for example `ChatPermission`, with:

- id
- userOneId -> User
- userTwoId -> User
- approvedByAdminId -> Admin
- sourceRequestId nullable -> ChatContactRequest
- expiresAt nullable
- createdAt
- updatedAt

Rules:

- Normalize user pairs into stable order before insert/check
- Unique pair per `(userOneId, userTwoId)`
- Once approved, the pair can DM without further requests
- Add revoke capability from admin side
- All DM permission checks must consult this model

7. Group conversation restrictions
   For v1, keep this strict and simple:

- User-created group chats must not become a cross-team escape hatch
- Either:
  a) scope user-created groups to one team, or
  b) enforce that all invited members belong to a common team boundary with the creator
  Choose the smallest clean implementation consistent with the repo
- Cross-team group approval is out of scope for this task
- Update group creation and group member addition to enforce the new rule

8. Reusable permission services
   Create or refactor reusable backend checks such as:

- `canUserChatWith(requesterId, targetId)`
- `hasSharedTeam(userAId, userBId)`
- `findApprovedChatPermission(userAId, userBId)`
- `canManageTeam(adminId, teamId)`
- `canReviewChatRequest(adminId, requestId)`

Make sure these checks are used consistently in:

- REST messaging APIs
- websocket/gateway chat flows where relevant
- group management logic

9. APIs to add/update

User-facing APIs under the existing client messaging domain:

- create chat request
- list my sent/received requests
- cancel my pending request
- optionally search/request out-of-team users separately from normal teammate list

Admin-facing APIs:

- list chat requests with filters: pending / approved / rejected / blocked
- approve request
- reject request
- block request/pair
- list approved permissions
- revoke approved permission

Do not create a disconnected API style. Follow existing route conventions and module structure.

10. Frontend changes: web app
    Update user chat UX in `apps/web/features/web/chat`:

- Normal new-chat picker should show only same-team users
- Add a “request to chat” flow for out-of-team users
- Show a clear message like:
  “You need manager approval to chat with this user.”
- Add optional reason input
- Show request states where useful: pending / approved / rejected / blocked
- If approved and no DM exists yet, opening chat should create/reuse the DM normally

11. Frontend changes: admin app
    Extend existing admin app:

- Keep the existing Teams section and extend it with description + manager if needed
- Add a new admin page for chat/contact requests
- Add filters and approve/reject/block actions
- Add a page or section for approved cross-team permissions if needed
- Reuse existing admin auth, permissions, tables, hooks, services, and UI patterns

12. RBAC
    If needed, add a coherent new admin permission family, for example:

- `chat-requests.view`
- `chat-requests.review`
- `chat-permissions.view`
- `chat-permissions.revoke`

Keep naming consistent with the current RBAC tree and admin permission catalog.

13. Database / migration requirements

- Extend existing Team model instead of replacing it
- Add new request/permission models
- Add indexes and uniqueness constraints:
  - existing team member uniqueness must remain
  - pending request lookup must be efficient
  - approved pair uniqueness must be enforced
- Make migrations safe for existing data
- If `managerAdminId` cannot be made required safely, make it nullable and enforce on new/updated teams in application logic

14. Legacy data behavior
    This repo may already contain direct conversations between users who would no longer be allowed under the new rules.
    Do not delete old data automatically.
    Instead:

- enforce the new permission checks for future open/send/fetch behavior
- if a legacy direct conversation exists between a now-unauthorized pair, treat it as blocked unless they share a team or have an approved permission
  Document this decision in the final summary.

15. Testing
    Add/adjust tests for:

- same-team users can open DM
- different-team users cannot open DM without approval
- cross-team chat request can be created
- duplicate pending request is blocked
- manager/admin can approve allowed requests
- unrelated manager cannot approve unrelated request
- after approval, pair can open DM
- unauthorized direct message send is blocked
- group creation/member-add cannot bypass team restriction
- revoke permission removes future access

Run relevant:

- lint
- typecheck
- targeted tests
- build if feasible

If full-suite execution is too heavy, run the smallest meaningful set and state exactly what was run.

Constraints:

- Keep changes minimal but complete end-to-end
- Reuse existing folder structure and patterns
- Do not break meeting chat, LiveKit, or admin auth
- Do not add speculative features outside this scope
- Do not revert unrelated changes

Deliverables:

1. Code changes
2. Prisma schema changes + migration
3. Tests
4. Final summary including:
   - models changed/added
   - API routes changed/added
   - UI/admin pages changed
   - key permission assumptions
   - commands/tests run
   - any follow-up risks or migration notes
