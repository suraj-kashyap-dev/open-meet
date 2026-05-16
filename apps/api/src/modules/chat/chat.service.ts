import { Injectable } from '@nestjs/common';

import type { MessageDto } from '@open-meet/types';

import {
  ChatRepository,
  type MessageWithSender,
} from './chat.repository';

@Injectable()
export class ChatService {
  constructor(private readonly chat: ChatRepository) {}

  async send(input: {
    meetingId: string;
    senderId: string;
    content: string;
  }): Promise<MessageDto> {
    const message = await this.chat.create(input);
    return this.toDto(message);
  }

  async history(meetingId: string): Promise<MessageDto[]> {
    const messages = await this.chat.listForMeeting(meetingId);
    return messages.map((m) => this.toDto(m));
  }

  private toDto(m: MessageWithSender): MessageDto {
    return {
      id: m.id,
      meetingId: m.meetingId,
      content: m.content,
      sender: {
        id: m.sender.id,
        name: m.sender.name,
        avatar: m.sender.avatar,
      },
      sentAt: m.sentAt.toISOString(),
    };
  }
}
