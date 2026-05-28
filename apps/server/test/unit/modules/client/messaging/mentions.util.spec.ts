import { describe, expect, it } from 'vitest';

import { MentionKind } from '@open-meet/types';

import { parseMentions } from '@/modules/client/messaging/mentions.util';

describe('parseMentions()', () => {
  it('should return no mentions for plain text', () => {
    expect(parseMentions('hello world, email a@b.com')).toEqual([]);
  });

  it('should parse a single [@name](userId) token into a USER mention', () => {
    expect(parseMentions('hi [@Ada Lovelace](user_123)!')).toEqual([
      { kind: MentionKind.USER, userId: 'user_123' },
    ]);
  });

  it('should parse multiple distinct user mentions in order', () => {
    expect(parseMentions('[@A](u1) and [@B](u2)')).toEqual([
      { kind: MentionKind.USER, userId: 'u1' },
      { kind: MentionKind.USER, userId: 'u2' },
    ]);
  });

  it('should de-duplicate the same user mentioned twice', () => {
    expect(parseMentions('[@A](u1) ... [@A again](u1)')).toEqual([
      { kind: MentionKind.USER, userId: 'u1' },
    ]);
  });

  it('should not treat a normal markdown link as a mention', () => {
    expect(parseMentions('see [the docs](https://example.com)')).toEqual([]);
  });

  it('should detect @everyone', () => {
    expect(parseMentions('heads up @everyone please read')).toContainEqual({
      kind: MentionKind.EVERYONE,
      userId: null,
    });
  });

  it('should detect @channel', () => {
    expect(parseMentions('@channel standup in 5')).toContainEqual({
      kind: MentionKind.CHANNEL,
      userId: null,
    });
  });

  it('should not treat an email-like @ as a mention', () => {
    expect(parseMentions('reach me at name@everyone.example')).toEqual([]);
  });
});
