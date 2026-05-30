import { Prisma } from '@prisma/client';

const senderSelect = { id: true, name: true, avatarKey: true } satisfies Prisma.UserSelect;

export const chatMessageInclude = {
  sender: { select: senderSelect },
  attachments: true,
  reactions: true,
  mentions: true,
  poll: { include: { options: { include: { votes: true }, orderBy: { order: 'asc' } } } },
  parent: { include: { sender: { select: senderSelect } } },
} satisfies Prisma.ChatMessageInclude;

export type ChatMessageWithRelations = Prisma.ChatMessageGetPayload<{
  include: typeof chatMessageInclude;
}>;

export const conversationInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, avatarKey: true, chatDisabled: true } },
    },
  },
} satisfies Prisma.ConversationInclude;

export type ConversationWithMembers = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

export const conversationListInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, avatarKey: true, chatDisabled: true } },
    },
  },
  messages: { include: chatMessageInclude, orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.ConversationInclude;

export type ConversationListRow = Prisma.ConversationGetPayload<{
  include: typeof conversationListInclude;
}>;

export const pollInclude = {
  options: { include: { votes: true }, orderBy: { order: 'asc' } },
} satisfies Prisma.PollInclude;

export type PollWithOptions = Prisma.PollGetPayload<{ include: typeof pollInclude }>;
