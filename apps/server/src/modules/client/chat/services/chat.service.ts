import { Injectable } from '@nestjs/common';

import type { MessageDto } from '@open-meet/types';

import { StorageService } from '../../../../storage/services/storage.service';
import { UploadsService } from '../../../uploads/services/uploads.service';
import { ChatRepository, type MessageWithSender } from '../repositories/chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly chat: ChatRepository,
    private readonly uploads: UploadsService,
    private readonly storage: StorageService,
  ) {}

  async send(input: {
    meetingId: string;
    senderId: string;
    content: string;
    attachmentIds?: string[];
  }): Promise<MessageDto> {
    const message = await this.chat.create({
      meetingId: input.meetingId,
      senderId: input.senderId,
      content: input.content,
    });

    if (input.attachmentIds && input.attachmentIds.length > 0) {
      await this.uploads.claim(input.attachmentIds, input.senderId, message.id);
    }

    const refreshed = await this.chat.findById(message.id);
    return this.toDto(refreshed ?? message);
  }

  async history(meetingId: string): Promise<MessageDto[]> {
    const messages = await this.chat.listForMeeting(meetingId);
    return messages.map((m) => this.toDto(m));
  }

  async pagedHistory(
    meetingId: string,
    options: { cursor?: string; limit?: number },
  ): Promise<{ items: MessageDto[]; nextCursor: string | null }> {
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));

    const rows = await this.chat.listMeetingHistory({
      meetingId,
      cursor: options.cursor,
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(rows.length - limit) : rows;
    const firstInSlice = slice[0];
    const nextCursor = hasMore && firstInSlice ? firstInSlice.sentAt.toISOString() : null;

    return {
      items: slice.map((m) => this.toDto(m)),
      nextCursor,
    };
  }

  private toDto(m: MessageWithSender): MessageDto {
    return {
      id: m.id,
      meetingId: m.meetingId,
      content: m.content,
      sender: {
        id: m.sender.id,
        name: m.sender.name,
        avatar: m.sender.avatarKey ? this.storage.publicUrl(m.sender.avatarKey) : null,
      },
      sentAt: m.sentAt.toISOString(),
      attachments: m.attachments.map((a) => this.uploads.toDto(a)),
    };
  }
}
