'use client';

import { useLocale } from 'next-intl';

import type { ConversationDto } from '@open-meet/types';

import { conversationDisplay } from '../lib/conversation-display';
import { GroupInfoPanel } from './group-info-panel';
import { PeerProfilePanel } from './peer-profile-panel';

export function ConversationInfoPanel({
  conversation,
  currentUserId,
}: {
  conversation: ConversationDto;
  currentUserId: string | undefined;
}) {
  const locale = useLocale();
  const display = conversationDisplay(conversation, currentUserId);

  if (display.isGroup) {
    return <GroupInfoPanel conversation={conversation} currentUserId={currentUserId} />;
  }

  if (!display.peer) {
    return null;
  }

  return <PeerProfilePanel peer={display.peer} locale={locale} />;
}
