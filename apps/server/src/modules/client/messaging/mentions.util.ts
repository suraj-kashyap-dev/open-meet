import { MentionKind } from '@open-meet/types';

export interface ParsedMention {
  kind: MentionKind;
  userId: string | null;
}

// Mention encoding the composer emits — a markdown link whose label starts with
// `@` and whose href is a bare userId: `[@Display Name](userId)`. The leading `@`
// in the label distinguishes mentions from ordinary `[text](url)` links.
const USER_MENTION = /\[@[^\]]+\]\(([a-zA-Z0-9_-]+)\)/g;
// `@everyone` / `@channel` only when preceded by start/whitespace (so emails don't match).
const EVERYONE = /(^|\s)@everyone\b/i;
const CHANNEL = /(^|\s)@channel\b/i;

/**
 * Extracts the distinct mentions from a message body. User mentions are
 * de-duplicated and returned in first-seen order; `@everyone`/`@channel` append
 * a whole-room mention.
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(USER_MENTION)) {
    const userId = match[1];
    if (userId && !seen.has(userId)) {
      seen.add(userId);
      mentions.push({ kind: MentionKind.USER, userId });
    }
  }

  if (EVERYONE.test(content)) {
    mentions.push({ kind: MentionKind.EVERYONE, userId: null });
  } else if (CHANNEL.test(content)) {
    mentions.push({ kind: MentionKind.CHANNEL, userId: null });
  }

  return mentions;
}
