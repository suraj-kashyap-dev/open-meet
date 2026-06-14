import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from '../setup-app';

describe('Group chat history sharing on add (e2e)', () => {
  let app: NestFastifyApplication;

  let alice: { id: string; cookie: string };
  let bob: { id: string; cookie: string };
  let carol: { id: string; cookie: string };
  let dave: { id: string; cookie: string };
  let erin: { id: string; cookie: string };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

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
      email: 'carol@example.com',
      password: 'secretpass1',
      name: 'Carol',
    });
    const d = await registerUser(app, {
      email: 'dave@example.com',
      password: 'secretpass1',
      name: 'Dave',
    });
    const e = await registerUser(app, {
      email: 'erin@example.com',
      password: 'secretpass1',
      name: 'Erin',
    });

    alice = { id: a.user!.id, cookie: a.cookie };

    bob = { id: b.user!.id, cookie: b.cookie };

    carol = { id: c.user!.id, cookie: c.cookie };

    dave = { id: d.user!.id, cookie: d.cookie };

    erin = { id: e.user!.id, cookie: e.cookie };
  });

  function createGroup(cookie: string, title: string, memberIds: string[]) {
    return http(app).post('/api/messaging/groups').set('Cookie', cookie).send({ title, memberIds });
  }

  function addMembers(
    cookie: string,
    groupId: string,
    userIds: string[],
    history?: { mode: string; days?: number },
  ) {
    return http(app)
      .post(`/api/messaging/groups/${groupId}/members`)
      .set('Cookie', cookie)
      .send({ userIds, history });
  }

  function sendMessage(cookie: string, conversationId: string, content: string) {
    return http(app)
      .post(`/api/messaging/conversations/${conversationId}/messages`)
      .set('Cookie', cookie)
      .send({ content });
  }

  function historyContents(cookie: string, conversationId: string) {
    return http(app)
      .get(`/api/messaging/conversations/${conversationId}/messages`)
      .set('Cookie', cookie)
      .then((res) => (res.body.data.items as { content: string }[]).map((m) => m.content));
  }

  it('should hide pre-join history when added with NONE, but show messages sent after joining', async () => {
    const groupId = (await createGroup(alice.cookie, 'Launch crew', [bob.id])).body.data.id;

    await sendMessage(alice.cookie, groupId, 'before-1');

    await sendMessage(alice.cookie, groupId, 'before-2');

    await addMembers(alice.cookie, groupId, [carol.id], { mode: 'NONE' });

    expect(await historyContents(carol.cookie, groupId)).toEqual([]);

    await sendMessage(alice.cookie, groupId, 'after-join');

    expect(await historyContents(carol.cookie, groupId)).toEqual(['after-join']);
  });

  it('should show full history to a member added with ALL', async () => {
    const groupId = (await createGroup(alice.cookie, 'Launch crew', [bob.id])).body.data.id;

    await sendMessage(alice.cookie, groupId, 'before-1');

    await sendMessage(alice.cookie, groupId, 'before-2');

    await addMembers(alice.cookie, groupId, [dave.id], { mode: 'ALL' });

    expect(await historyContents(dave.cookie, groupId)).toEqual(['before-1', 'before-2']);
  });

  it('should default to full history when no choice is provided', async () => {
    const groupId = (await createGroup(alice.cookie, 'Launch crew', [bob.id])).body.data.id;

    await sendMessage(alice.cookie, groupId, 'before-1');

    await addMembers(alice.cookie, groupId, [dave.id]);

    expect(await historyContents(dave.cookie, groupId)).toEqual(['before-1']);
  });

  it('should include recent history within the chosen day window', async () => {
    const groupId = (await createGroup(alice.cookie, 'Launch crew', [bob.id])).body.data.id;

    await sendMessage(alice.cookie, groupId, 'before-1');

    await addMembers(alice.cookie, groupId, [erin.id], { mode: 'DAYS', days: 30 });

    expect(await historyContents(erin.cookie, groupId)).toEqual(['before-1']);
  });

  it('should never bound an original member to a cutoff', async () => {
    const groupId = (await createGroup(alice.cookie, 'Launch crew', [bob.id])).body.data.id;

    await sendMessage(alice.cookie, groupId, 'before-1');

    await sendMessage(alice.cookie, groupId, 'before-2');

    await addMembers(alice.cookie, groupId, [carol.id], { mode: 'NONE' });

    expect(await historyContents(bob.cookie, groupId)).toEqual(['before-1', 'before-2']);
  });

  it('should reject an invalid day count with VALIDATION_FAILED', async () => {
    const groupId = (await createGroup(alice.cookie, 'Launch crew', [bob.id])).body.data.id;

    const res = await addMembers(alice.cookie, groupId, [carol.id], { mode: 'DAYS', days: 0 });

    expect(res.status).toBe(400);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
