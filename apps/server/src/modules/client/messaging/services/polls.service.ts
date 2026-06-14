import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ApiErrorCode,
  ChatServerEvent,
  type ChatMessageDto,
  type CreatePollDto,
  type PollDto,
} from '@open-meet/types';

import { ChatBus, conversationRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { MessagesService } from './messages.service';
import { MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { PollsRepository } from '@/modules/client/messaging/repositories/polls.repository';

const MAX_OPTIONS = 10;

@Injectable()
export class PollsService {
  constructor(
    private readonly polls: PollsRepository,
    private readonly conversations: ConversationsRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly messages: MessagesService,
    private readonly serializer: MessagingSerializer,
    private readonly bus: ChatBus,
  ) {}

  async create(
    conversationId: string,
    userId: string,
    dto: CreatePollDto,
  ): Promise<ChatMessageDto> {
    await this.permissions.assertCanPost(conversationId, userId);

    const question = dto.question.trim();
    const options = (dto.options ?? []).map((o) => o.trim()).filter((o) => o.length > 0);

    if (question.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'A poll needs a question.',
      });
    }

    if (options.length < 2) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'A poll needs at least two options.',
      });
    }

    if (options.length > MAX_OPTIONS) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `A poll can have at most ${MAX_OPTIONS} options.`,
      });
    }

    const message = await this.polls.createPollMessage({
      conversationId,
      senderId: userId,
      question,
      options,
      multiple: dto.multiple ?? false,
    });

    await this.conversations.touch(conversationId, message.createdAt);

    return this.messages.broadcastNew(message, userId);
  }

  async vote(pollId: string, userId: string, optionIds: string[]): Promise<PollDto> {
    const context = await this.polls.findContext(pollId);

    if (!context) {
      throw new NotFoundException({
        code: ApiErrorCode.POLL_NOT_FOUND,
        message: 'Poll not found.',
      });
    }

    await this.permissions.assertCanPost(context.conversationId, userId);

    if (context.closedAt !== null) {
      throw new ForbiddenException({
        code: ApiErrorCode.POLL_CLOSED,
        message: 'This poll is closed.',
      });
    }

    const ids = [...new Set(optionIds)];

    if (ids.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Select at least one option.',
      });
    }

    if (!context.multiple && ids.length > 1) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'This poll only allows one choice.',
      });
    }

    const validIds = new Set(await this.polls.optionIdsForPoll(pollId));

    if (ids.some((id) => !validIds.has(id))) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'One or more options are not part of this poll.',
      });
    }

    await this.polls.setVotes(pollId, userId, ids);

    const poll = await this.polls.findWithOptions(pollId);

    if (!poll) {
      throw new NotFoundException({
        code: ApiErrorCode.POLL_NOT_FOUND,
        message: 'Poll not found.',
      });
    }

    const dto = this.serializer.poll(poll, userId);

    this.bus.emit(conversationRoom(context.conversationId), ChatServerEvent.POLL_UPDATE, {
      conversationId: context.conversationId,
      messageId: context.messageId,
      poll: dto,
    });

    return dto;
  }
}
