import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { PUSH_QUEUE, PushJob } from './push.constants';
import {
  PushDispatchService,
  type ChatMessageJob,
  type KnockJob,
} from './services/push-dispatch.service';

@Processor(PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly dispatch: PushDispatchService) {
    super();
  }

  async process(job: Job<ChatMessageJob | KnockJob>): Promise<void> {
    try {
      if (job.name === PushJob.CHAT_MESSAGE) {
        await this.dispatch.dispatchChatMessage(job.data as ChatMessageJob);
      } else if (job.name === PushJob.KNOCK) {
        await this.dispatch.dispatchKnock(job.data as KnockJob);
      }
    } catch (error) {
      this.logger.error(`push job ${job.name} failed: ${String(error)}`);
      throw error;
    }
  }
}
