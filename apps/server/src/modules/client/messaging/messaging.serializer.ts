import { Injectable } from '@nestjs/common';

import {
  MentionKind,
  type ChatMessageDto,
  type ChatMessagePriority,
  type ChatMessageType,
  type ConversationDto,
  type ConversationMemberDto,
  type ConversationMemberRole,
  type ConversationType,
  type MessageSenderDto,
  type PollDto,
  type PresenceStatus,
  type ReactionSummaryDto,
} from '@open-meet/types';

import { StorageService } from '../../../storage/storage.service';
import { UploadsService } from '../../uploads/uploads.service';

import type {
  ChatMessageWithRelations,
  ConversationWithMembers,
  PollWithOptions,
} from './messaging.includes';

import type { PresenceSnapshot } from './presence.service';

interface SenderRow {
  id: string;
  name: string;
  avatarKey: string | null;
}

@Injectable()
export class MessagingSerializer {
  constructor(
    private readonly storage: StorageService,
    private readonly uploads: UploadsService,
  ) {}

  avatar(key: string | null): string | null {
    return key ? this.storage.publicUrl(key) : null;
  }

  sender(row: SenderRow | null): MessageSenderDto | null {
    if (!row) {
      return null;
    }

    return { id: row.id, name: row.name, avatar: this.avatar(row.avatarKey) };
  }

  message(
    m: ChatMessageWithRelations,
    viewerId: string,
    flags?: { pinnedMessageIds?: ReadonlySet<string>; savedMessageIds?: ReadonlySet<string> },
  ): ChatMessageDto {
    const deleted = m.deletedAt !== null;
    const userMentions = m.mentions.filter(
      (mention) => mention.kind === MentionKind.USER && mention.mentionedUserId !== null,
    );

    return {
      id: m.id,
      conversationId: m.conversationId,
      type: m.type as ChatMessageType,
      priority: m.priority as ChatMessagePriority,
      content: deleted ? '' : m.content,
      sender: this.sender(m.sender),
      parentId: m.parentId,
      parent: m.parent
        ? {
            id: m.parent.id,
            content: m.parent.deletedAt !== null ? '' : m.parent.content,
            sender: this.sender(m.parent.sender),
            deletedAt: m.parent.deletedAt?.toISOString() ?? null,
          }
        : null,
      replyCount: m.replyCount,
      attachments: deleted ? [] : m.attachments.map((a) => this.uploads.toDto(a)),
      reactions: this.reactions(m.reactions, viewerId),
      poll: m.poll ? this.poll(m.poll, viewerId) : null,
      mentionedUserIds: userMentions.map((mention) => mention.mentionedUserId as string),
      mentionsEveryone: m.mentions.some(
        (mention) => mention.kind === MentionKind.EVERYONE || mention.kind === MentionKind.CHANNEL,
      ),
      pinned: flags?.pinnedMessageIds?.has(m.id) ?? false,
      saved: flags?.savedMessageIds?.has(m.id) ?? false,
      editedAt: m.editedAt?.toISOString() ?? null,
      deletedAt: m.deletedAt?.toISOString() ?? null,
      sentAt: m.createdAt.toISOString(),
    };
  }

  reactions(rows: { emoji: string; userId: string }[], viewerId: string): ReactionSummaryDto[] {
    const byEmoji = new Map<string, string[]>();

    for (const r of rows) {
      const userIds = byEmoji.get(r.emoji) ?? [];
      userIds.push(r.userId);
      byEmoji.set(r.emoji, userIds);
    }

    return [...byEmoji.entries()].map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      userIds,
      reactedByMe: userIds.includes(viewerId),
    }));
  }

  poll(p: PollWithOptions, viewerId: string): PollDto {
    const options = p.options.map((o) => ({
      id: o.id,
      text: o.text,
      order: o.order,
      voteCount: o.votes.length,
      votedByMe: o.votes.some((v) => v.userId === viewerId),
    }));

    return {
      id: p.id,
      question: p.question,
      multiple: p.multiple,
      closedAt: p.closedAt?.toISOString() ?? null,
      totalVotes: p.options.reduce((sum, o) => sum + o.votes.length, 0),
      options,
    };
  }

  conversation(
    c: ConversationWithMembers,
    opts: {
      viewerId: string;
      presence: ReadonlyMap<string, PresenceSnapshot>;
      lastMessage: ChatMessageWithRelations | null;
      unreadCount: number;
    },
  ): ConversationDto {
    const members: ConversationMemberDto[] = c.members.map((member) => {
      const snap = opts.presence.get(member.userId);
      return {
        userId: member.userId,
        name: member.user.name,
        avatar: this.avatar(member.user.avatarKey),
        role: member.role as ConversationMemberRole,
        lastReadAt: member.lastReadAt?.toISOString() ?? null,
        online: snap?.online ?? false,
        status: (snap?.status as PresenceStatus | undefined) ?? null,
        customText: snap?.customText ?? null,
        lastSeen: snap?.lastSeen ?? null,
        chatDisabled: member.user.chatDisabled,
      };
    });

    const mine = c.members.find((m) => m.userId === opts.viewerId);

    return {
      id: c.id,
      type: c.type as ConversationType,
      title: c.title,
      description: c.description,
      teamId: c.teamId,
      members,
      lastMessage: opts.lastMessage ? this.message(opts.lastMessage, opts.viewerId) : null,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      unreadCount: opts.unreadCount,
      muted: mine?.muted ?? false,
      pinned: mine?.pinned ?? false,
      hidden: mine?.hidden ?? false,
      youAreAdmin: mine?.role === 'ADMIN',
      createdAt: c.createdAt.toISOString(),
    };
  }
}
