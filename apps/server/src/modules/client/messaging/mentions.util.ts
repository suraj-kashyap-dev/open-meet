import { MentionKind } from '@open-meet/types';

export interface ParsedMention {
  kind: MentionKind;
  userId: string | null;
}

const USER_MENTION = /\[@[^\]]+\]\(([a-zA-Z0-9_-]+)\)/g;
const EVERYONE = /(^|\s)@everyone\b/i;

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
  }

  return mentions;
}
