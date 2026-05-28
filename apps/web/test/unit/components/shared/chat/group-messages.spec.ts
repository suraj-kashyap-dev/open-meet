import { describe, expect, it } from 'vitest';

import { buildMessageRows, type GroupableMessage } from '@/components/shared/chat/group-messages';

function msg(id: string, senderId: string | null, sentAt: string): GroupableMessage {
  return { id, sender: senderId === null ? null : { id: senderId }, sentAt };
}

const BASE = '2026-05-27T10:00:00.000Z';
function plusSeconds(seconds: number): string {
  return new Date(new Date(BASE).getTime() + seconds * 1000).toISOString();
}

describe('buildMessageRows()', () => {
  it('should return an empty list when there are no messages', () => {
    expect(buildMessageRows([], 'u1')).toEqual([]);
  });

  it('should mark a lone message as both group head and tail', () => {
    const rows = buildMessageRows([msg('m1', 'u2', BASE)], 'u1');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'm1', isMe: false, isGroupHead: true, isGroupTail: true });
  });

  it('should flag isMe when the sender matches the current user', () => {
    const rows = buildMessageRows([msg('m1', 'u1', BASE)], 'u1');

    expect(rows[0]!.isMe).toBe(true);
  });

  it('should not flag isMe when the current user id is undefined', () => {
    const rows = buildMessageRows([msg('m1', 'u1', BASE)], undefined);

    expect(rows[0]!.isMe).toBe(false);
  });

  it('should group consecutive messages from the same sender within the window', () => {
    const rows = buildMessageRows(
      [msg('m1', 'u2', BASE), msg('m2', 'u2', plusSeconds(30))],
      'u1',
    );

    expect(rows[0]).toMatchObject({ isGroupHead: true, isGroupTail: false });
    expect(rows[1]).toMatchObject({ isGroupHead: false, isGroupTail: true });
  });

  it('should split same-sender messages that are more than the window apart', () => {
    const rows = buildMessageRows(
      [msg('m1', 'u2', BASE), msg('m2', 'u2', plusSeconds(180))],
      'u1',
    );

    expect(rows[0]).toMatchObject({ isGroupHead: true, isGroupTail: true });
    expect(rows[1]).toMatchObject({ isGroupHead: true, isGroupTail: true });
  });

  it('should never group messages from different senders', () => {
    const rows = buildMessageRows(
      [msg('m1', 'u2', BASE), msg('m2', 'u3', plusSeconds(10))],
      'u1',
    );

    expect(rows[0]).toMatchObject({ isGroupHead: true, isGroupTail: true });
    expect(rows[1]).toMatchObject({ isGroupHead: true, isGroupTail: true });
  });

  it('should keep messages with a deleted (null) sender as standalone rows', () => {
    const rows = buildMessageRows(
      [msg('m1', null, BASE), msg('m2', null, plusSeconds(10))],
      'u1',
    );

    expect(rows[0]).toMatchObject({ isMe: false, isGroupHead: true, isGroupTail: true });
    expect(rows[1]).toMatchObject({ isMe: false, isGroupHead: true, isGroupTail: true });
  });
});
