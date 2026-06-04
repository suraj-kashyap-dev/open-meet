# Plan — Department-Scoped Chat with Manager Approval

> Status: **IMPLEMENTED** (2026-06-02). Built with the §6 recommended defaults:
> manager = a regular User, admin-assign + user-self-request-to-join, cross-dept
> chat via manager approval, any one of the target's managers can approve.
> Goal: replace the admin-console "chat access request" flow with a clean,
> in-product model: users chat freely inside their department, and a
> **department manager** approves anything that crosses a department boundary.

---

## 1. The idea in one paragraph

Every user belongs to one or more **departments** (e.g. _Magento_, _Vue.js_).
Inside a department, anyone can message anyone — no approval. To reach someone
**outside** your department, you send a **chat request** that goes to that
person's **department manager**, who approves or denies it **inside the web app**
(not the admin console). A manager only ever deals with their own department.

---

## 2. Roles

| Role        | Who they are                                         | What they do                                                                                                                 |
| ----------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Admin**   | Admin-console user (existing)                        | Creates departments, assigns each a manager, sees ALL users, can add/remove members directly                                 |
| **Manager** | A regular **User** promoted to manage one department | Approves join requests + cross-department chat requests for **their own** department. Scoped — never sees the full user list |
| **Member**  | A regular User in ≥1 department                      | Chats freely within their department(s); requests access to reach outsiders                                                  |

---

## 3. Core rules

1. **Within a department = open.** Two users sharing a department can DM and form
   groups with no approval. (Keeps the existing `shareDepartment` gate.)
2. **Across departments = manager-approved.** Messaging an outsider requires a
   request approved by the **target's** department manager.
3. **Managers are department-scoped.** A manager sees only their own department's
   roster + requests addressed to them. **No manager can list all users** — that
   is admin-only.
4. **No dead-ends.** A denied request just closes and can be re-sent; managers
   are visible in-product so users know who to ask.

---

## 4. Visibility — worked example

Departments: **Magento** (manager Alice; members U1, U2) and
**Vue.js** (manager Bob; members U3, U4). **U5** has no department.

| Capability                  | Alice (Magento mgr)                           | Bob (Vue.js mgr)    | Admin |
| --------------------------- | --------------------------------------------- | ------------------- | ----- |
| See Magento roster (U1, U2) | ✅                                            | ❌                  | ✅    |
| See Vue.js roster (U3, U4)  | ❌                                            | ✅                  | ✅    |
| Browse **all users**        | ❌                                            | ❌                  | ✅    |
| See U5 (no dept)            | only if U5 requests to join/chat into Magento | only if into Vue.js | ✅    |

A manager only sees an outsider **through a request routed to them** — never by
browsing out to find people.

---

## 5. The three flows

### 5a. Associating a user with a department

- **Admin assigns** members directly (existing admin UI), **and/or**
- **User self-requests** to join a department → the department **manager**
  approves/denies in their in-app inbox.

### 5b. Conversation within a department

- Any two members of the same department DM / group freely. No request, no
  approval. This is the default-open surface.

### 5c. Cross-department chat (manager approval)

1. User wants to message someone outside their departments.
2. Sends a **chat request** targeting that person.
3. Routes to the **target's** department manager.
4. **Approve** → a 1:1 chat grant is created and the DM opens for both.
5. **Deny** → request closes; can be re-sent later (no permanent block).

---

## 6. Open decisions (please tick)

Recommended option is pre-marked. Change if you disagree.

- [x] **Manager identity:** a regular **User** promoted to manager _(recommended)_
      — _alt:_ [ ] the department's admin-console responsible admin
- [x] **Department association:** admin-assigns **AND** user-can-request-to-join
      — _alt:_ [ ] admin-assigns only
- [x] **Cross-department chat:** allowed **via manager approval** _(recommended)_
      — _alt:_ [ ] forbidden entirely (department-only, no cross-dept)
- [ ] **Multi-department target** (target belongs to 2+ depts), pick one:
  - [x] (a) any one of the target's managers approving is enough _(recommended)_
  - [ ] (b) all the target's managers are notified; first decision wins

---

## 7. What changes vs today

### Keep

- `Department` + `DepartmentMember` models and the admin Departments page.
- `shareDepartment` as the within-department chat gate.
- Department-scoped teammate search (`TeammatesRepository.search`) — but drop the
  old "approved grant" OR-branches and re-wire to the new grant model.

### Add

- `Department.managerUserId` → a `User` (the manager).
- A **join request** concept (user → manager).
- A **cross-department chat request + grant** concept (requester → target's manager).
- A web **manager inbox** (join + chat requests) and user-facing entry points
  ("request to join", "request to chat", "your departments + manager").

### Remove (the old admin-console request flow)

- Admin `chat-access` module (controller/service/repository).
- Admin **Chat requests** page, `features/chat-access`, nav entry, `chat-requests`
  RBAC keys + i18n namespace.
- The email-lookup "request access" dialog in web and its hooks/services.
- The old `ChatAccessRequest` semantics where a **responsible admin** decides.

---

## 8. Implementation outline (file-by-file, once design is approved)

### Database / Prisma (`apps/server/prisma/schema/`)

- `messaging.prisma`: add `managerUserId` to `Department`; redesign the request
  table(s):
  - `DepartmentJoinRequest` (requesterId, departmentId, status).
  - `ChatAccessRequest` reworked so the **decider is the target's manager (User)**,
    not an admin (drop `decidedByAdminId` → `decidedByUserId`).
- Replace the untracked `20260601120000_add_chat_access_request` migration with a
  fresh migration. (Needs `pnpm db:reset` afterward — will confirm before running.)

### Server (`apps/server/src/modules/`)

- `client/messaging/`:
  - `chat-permissions`: `canDirectMessage` = `shareDepartment` OR active manager-
    approved grant.
  - New manager-facing service + controller (join + chat request inbox, approve/
    deny), scoped by `Department.managerUserId = me`.
  - User-facing: create join request, create chat request, list my requests.
  - `teammates.repository`: department-scope + re-wire grant branch to new model.
- `admin/`: remove `chat-access/*`; add manager picker support to
  `departments` (set `managerUserId`).

### Shared types (`packages/types/src/`)

- `dto/messaging.ts`: new request/grant + manager-inbox DTOs; drop admin-decider DTOs.
- `socket.ts`: replace `ACCESS_REQUEST_RESOLVED` (admin) with manager-decision events.
- `api.ts`: keep `CHAT_ACCESS_REQUIRED`; meaning = "needs manager approval".

### Web (`apps/web/features/web/chat/`)

- Remove `request-access-dialog.tsx` (email lookup) + its hooks/services.
- Add: department/manager visibility, "request to join", "request to chat",
  and (for managers) a **Requests inbox**.

### Admin (`apps/admin/`)

- Departments create/edit: add **manager (User)** picker.
- Remove `chat-requests` page, `features/chat-access`, nav entry, RBAC keys, i18n.

### i18n

- English first, mirror to all 15 locales, `pnpm i18n:verify`.

### Tests (TDD — failing tests first)

- Unit: `chat-permissions` (within-dept allow / cross-dept deny without grant /
  allow with grant); manager-scope guard (Alice can't act on Vue.js requests).
- E2E: server messaging request→approve→DM-opens; web manager inbox; admin
  manager assignment.

---

## 9. Risks / notes

- Reintroducing a grant/request model (different from the earlier "remove
  completely" direction) — this supersedes that, per the manager-approval requirement.
- DB reset required for the migration swap (dev only, will confirm first).
- `web build` is occasionally flaky ("Cannot find module") — retry if it trips.
