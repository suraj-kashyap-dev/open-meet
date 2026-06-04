---
name: realtime-contracts
description: Use when changing websocket / Socket.IO behavior — events, payloads, or gateways. open-meet has two namespaces (/meeting and /chat); this skill keeps the shared socket contract and both ends in sync.
---

# Realtime / socket contracts

Two Socket.IO namespaces, both fanned out via the Redis adapter (`apps/server/src/websocket/redis-io.adapter.ts`):

- **`/meeting`** — meeting orchestration (join/leave, knock, reactions, raise hand, ephemeral meeting chat, presence, recording). Gateway: `apps/server/src/modules/client/chat/chat.gateway.ts`. Web consumer: `apps/web/features/web/meeting/*`.
- **`/chat`** — persistent team messaging (messages, reactions, typing, read receipts, presence, polls, pins, conversation updates). Gateway: `apps/server/src/modules/client/messaging/conversation.gateway.ts`. Web consumer: `apps/web/features/web/chat/*`.

## Rule: contract first, both ends together

1. Event names + payload types live in `packages/types/src/socket.ts` (`SocketNamespace` / `ClientEvent` / `ServerEvent` and `ChatNamespace` / `ChatClientEvent` / `ChatServerEvent`). **Edit there first** — never inline event-name strings in a gateway or client.
2. Update the **server gateway** handler/emitter for the correct namespace.
3. Update the **frontend consumer** for the same namespace.
4. If payloads are persisted, check the matching DTOs (`dto/messaging.ts` / `dto/meeting.ts`) and the repositories.
5. Preserve multi-instance fan-out (bus services), guest scoping, and connection auth.

## Validate

```
pnpm --filter @open-meet/types build && pnpm --filter @open-meet/server typecheck && pnpm --filter @open-meet/web typecheck
```

Add server `test:e2e` when socket contracts change.
