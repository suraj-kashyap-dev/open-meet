import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/database/prisma.service';

import { createTestApp, http, registerUser, resetDb } from './setup-app';

describe('Messaging / persistent chat (e2e)', () => {
  let app: NestFastifyApplication;

  // Two teammates (share a department) + one outsider (shares no department with anyone).
  let alice: { id: string; cookie: string };
  let bob: { id: string; cookie: string };
  let outsider: { id: string; cookie: string };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // Admin-managed departments gate DMs, so seed a shared Department + DepartmentMember rows
  // directly via Prisma (there is no client-facing endpoint to create departments).
  async function seedSharedDepartment(userIds: string[]): Promise<string> {
    const prisma = app.get(PrismaService);
    const department = await prisma.department.create({ data: { name: 'Engineering' } });
    await prisma.departmentMember.createMany({
      data: userIds.map((userId) => ({ departmentId: department.id, userId })),
    });
    return department.id;
  }

  beforeEach(async () => {
    await resetDb(app);

    const a = await registerUser(app, {
      email: 'alice@example.com',
      password: 'secretpass1',
      name: 'Alice',
    });
    const b = await registerUser(app, {
      email: 'bob@example.com',
      password: 'secretpass1',
      name: 'Bob',
    });
    const c = await registerUser(app, {
      email: 'outsider@example.com',
      password: 'secretpass1',
      name: 'Outsider',
    });

    alice = { id: a.user!.id, cookie: a.cookie };
    bob = { id: b.user!.id, cookie: b.cookie };
    outsider = { id: c.user!.id, cookie: c.cookie };

    // Alice and Bob share a department; the outsider is left out on purpose.
    await seedSharedDepartment([alice.id, bob.id]);
  });

  function openDirect(cookie: string, targetUserId: string) {
    return http(app)
      .post('/api/messaging/conversations/direct')
      .set('Cookie', cookie)
      .send({ targetUserId });
  }

  function sendMessage(cookie: string, conversationId: string, content: string) {
    return http(app)
      .post(`/api/messaging/conversations/${conversationId}/messages`)
      .set('Cookie', cookie)
      .send({ content });
  }

  function history(cookie: string, conversationId: string) {
    return http(app)
      .get(`/api/messaging/conversations/${conversationId}/messages`)
      .set('Cookie', cookie);
  }

  function listConversations(cookie: string) {
    return http(app).get('/api/messaging/conversations').set('Cookie', cookie);
  }

  function clearConversation(cookie: string, conversationId: string) {
    return http(app)
      .post(`/api/messaging/conversations/${conversationId}/clear`)
      .set('Cookie', cookie);
  }

  function deleteConversation(cookie: string, conversationId: string) {
    return http(app)
      .post(`/api/messaging/conversations/${conversationId}/delete`)
      .set('Cookie', cookie);
  }

  describe('POST /api/messaging/conversations/direct', () => {
    it('should open a DIRECT conversation with both users as members when the two share a department', async () => {
      const res = await openDirect(alice.cookie, bob.id);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.timestamp).toBeTruthy();
      expect(res.body.data.type).toBe('DIRECT');

      const memberIds = (res.body.data.members as { userId: string }[]).map((m) => m.userId);
      expect(memberIds).toContain(alice.id);
      expect(memberIds).toContain(bob.id);
    });

    it('should return the same conversation (get-or-create) when opened twice', async () => {
      const first = await openDirect(alice.cookie, bob.id);
      const second = await openDirect(alice.cookie, bob.id);

      expect(second.status).toBe(201);
      expect(second.body.data.id).toBe(first.body.data.id);
    });

    it('should let either teammate open the same DIRECT thread', async () => {
      const fromAlice = await openDirect(alice.cookie, bob.id);
      const fromBob = await openDirect(bob.cookie, alice.id);

      expect(fromBob.body.data.id).toBe(fromAlice.body.data.id);
    });

    it('should allow a DM with anyone, even with no shared department or group (chat is open)', async () => {
      const res = await openDirect(alice.cookie, outsider.id);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('DIRECT');
      const memberIds = (res.body.data.members as { userId: string }[]).map((m) => m.userId);
      expect(memberIds).toContain(alice.id);
      expect(memberIds).toContain(outsider.id);
    });

    it('should reject opening a DM with yourself with VALIDATION_FAILED', async () => {
      const res = await openDirect(alice.cookie, alice.id);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should require authentication', async () => {
      const res = await http(app)
        .post('/api/messaging/conversations/direct')
        .send({ targetUserId: bob.id });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/messaging/conversations/:id/messages', () => {
    it('should persist a message both teammates can read in history', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;

      const sent = await sendMessage(alice.cookie, conversationId, 'Hello Bob');
      expect(sent.status).toBe(201);
      expect(sent.body.success).toBe(true);
      expect(sent.body.data.content).toBe('Hello Bob');
      expect(sent.body.data.sender.id).toBe(alice.id);

      const aliceView = await history(alice.cookie, conversationId);
      expect(aliceView.status).toBe(200);
      expect(aliceView.body.data.items).toHaveLength(1);
      expect(aliceView.body.data.items[0].content).toBe('Hello Bob');

      const bobView = await history(bob.cookie, conversationId);
      expect(bobView.status).toBe(200);
      expect(bobView.body.data.items).toHaveLength(1);
      expect(bobView.body.data.items[0].id).toBe(sent.body.data.id);
    });

    it('should let both participants exchange messages in the same thread', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;

      await sendMessage(alice.cookie, conversationId, 'Hi from Alice');
      await sendMessage(bob.cookie, conversationId, 'Hi from Bob');

      const items = (await history(alice.cookie, conversationId)).body.data.items as {
        content: string;
        sender: { id: string };
      }[];
      expect(items).toHaveLength(2);
      expect(items.map((m) => m.content)).toEqual(['Hi from Alice', 'Hi from Bob']);
    });

    it('should reject an empty message with VALIDATION_FAILED', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      const res = await sendMessage(alice.cookie, conversationId, '   ');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should hide the conversation (CONVERSATION_NOT_FOUND) from a non-member', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      const res = await sendMessage(outsider.cookie, conversationId, 'sneaking in');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      const res = await http(app)
        .post(`/api/messaging/conversations/${conversationId}/messages`)
        .send({ content: 'no cookie' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/messaging/conversations/:id/messages', () => {
    it('should 404 history for a non-member with CONVERSATION_NOT_FOUND', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      const res = await history(outsider.cookie, conversationId);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });
  });

  describe('GET /api/messaging/conversations', () => {
    it('should list the DM for a participant after it is opened', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      await sendMessage(alice.cookie, conversationId, 'first message');

      const res = await http(app).get('/api/messaging/conversations').set('Cookie', bob.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ids = (res.body.data.items as { id: string }[]).map((c) => c.id);
      expect(ids).toContain(conversationId);
    });

    it('should require authentication', async () => {
      const res = await http(app).get('/api/messaging/conversations');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/messaging/conversations/:id/clear', () => {
    it('should clear history only for the caller and only show later messages afterwards', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      await sendMessage(alice.cookie, conversationId, 'Before clear');
      await sendMessage(bob.cookie, conversationId, 'Still before clear');

      const cleared = await clearConversation(alice.cookie, conversationId);
      expect(cleared.status).toBe(201);
      expect(cleared.body.success).toBe(true);
      expect(cleared.body.data.ok).toBe(true);

      const aliceAfterClear = await history(alice.cookie, conversationId);
      expect(aliceAfterClear.status).toBe(200);
      expect(aliceAfterClear.body.data.items).toHaveLength(0);

      const bobAfterClear = await history(bob.cookie, conversationId);
      expect(bobAfterClear.status).toBe(200);
      expect(bobAfterClear.body.data.items).toHaveLength(2);

      const aliceList = await listConversations(alice.cookie);
      const aliceConversation = (
        aliceList.body.data.items as { id: string; lastMessage: unknown; unreadCount: number }[]
      ).find((conversation) => conversation.id === conversationId);
      expect(aliceConversation).toBeDefined();
      expect(aliceConversation!.lastMessage).toBeNull();
      expect(aliceConversation!.unreadCount).toBe(0);

      await sendMessage(bob.cookie, conversationId, 'After clear');

      const aliceAfterNewMessage = await history(alice.cookie, conversationId);
      expect(
        (aliceAfterNewMessage.body.data.items as { content: string }[]).map(
          (message) => message.content,
        ),
      ).toEqual(['After clear']);
    });
  });

  describe('POST /api/messaging/conversations/:id/delete', () => {
    it('should remove the chat only for the caller and revive it on later activity', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      await sendMessage(alice.cookie, conversationId, 'Before delete');

      const deleted = await deleteConversation(alice.cookie, conversationId);
      expect(deleted.status).toBe(201);
      expect(deleted.body.success).toBe(true);
      expect(deleted.body.data.ok).toBe(true);

      const aliceListAfterDelete = await listConversations(alice.cookie);
      const aliceIds = (aliceListAfterDelete.body.data.items as { id: string }[]).map(
        (conversation) => conversation.id,
      );
      expect(aliceIds).not.toContain(conversationId);

      const bobList = await listConversations(bob.cookie);
      const bobIds = (bobList.body.data.items as { id: string }[]).map(
        (conversation) => conversation.id,
      );
      expect(bobIds).toContain(conversationId);

      const aliceHistoryAfterDelete = await history(alice.cookie, conversationId);
      expect(aliceHistoryAfterDelete.status).toBe(200);
      expect(aliceHistoryAfterDelete.body.data.items).toHaveLength(0);

      await sendMessage(bob.cookie, conversationId, 'After delete');

      const aliceListAfterRevive = await listConversations(alice.cookie);
      const revived = (
        aliceListAfterRevive.body.data.items as {
          id: string;
          lastMessage: { content: string } | null;
        }[]
      ).find((conversation) => conversation.id === conversationId);
      expect(revived).toBeDefined();
      expect(revived!.lastMessage?.content).toBe('After delete');

      const aliceHistoryAfterRevive = await history(alice.cookie, conversationId);
      expect(
        (aliceHistoryAfterRevive.body.data.items as { content: string }[]).map(
          (message) => message.content,
        ),
      ).toEqual(['After delete']);
    });
  });

  describe('GET /api/messaging/teammates', () => {
    it('should return every other user (open directory), excluding only the caller', async () => {
      const res = await http(app).get('/api/messaging/teammates').set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      const ids = (res.body.data.items as { id: string }[]).map((t) => t.id);
      expect(ids).toContain(bob.id);
      // Chat is open - even a user who shares no department is reachable.
      expect(ids).toContain(outsider.id);
      expect(ids).not.toContain(alice.id);
    });

    it('should filter the directory by a name/email search', async () => {
      const res = await http(app)
        .get('/api/messaging/teammates?search=Outsider')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      const ids = (res.body.data.items as { id: string }[]).map((t) => t.id);
      expect(ids).toContain(outsider.id);
      expect(ids).not.toContain(bob.id);
    });

    it('should require authentication', async () => {
      const res = await http(app).get('/api/messaging/teammates');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/messaging/messages/:id/reactions', () => {
    it('should persist a reaction that shows in the message history', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      const messageId = (await sendMessage(alice.cookie, conversationId, 'react to me')).body.data
        .id;

      const reacted = await http(app)
        .post(`/api/messaging/messages/${messageId}/reactions`)
        .set('Cookie', bob.cookie)
        .send({ emoji: '👍' });

      expect(reacted.status).toBe(201);
      expect(reacted.body.success).toBe(true);
      const summary = (
        reacted.body.data.reactions as {
          emoji: string;
          count: number;
          userIds: string[];
        }[]
      ).find((r) => r.emoji === '👍');
      expect(summary).toBeDefined();
      expect(summary!.count).toBe(1);
      expect(summary!.userIds).toContain(bob.id);

      const items = (await history(alice.cookie, conversationId)).body.data.items as {
        id: string;
        reactions: { emoji: string; count: number }[];
      }[];
      const stored = items.find((m) => m.id === messageId);
      expect(stored!.reactions.find((r) => r.emoji === '👍')!.count).toBe(1);
    });

    it('should require authentication', async () => {
      const conversationId = (await openDirect(alice.cookie, bob.id)).body.data.id;
      const messageId = (await sendMessage(alice.cookie, conversationId, 'x')).body.data.id;

      const res = await http(app)
        .post(`/api/messaging/messages/${messageId}/reactions`)
        .send({ emoji: '👍' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
