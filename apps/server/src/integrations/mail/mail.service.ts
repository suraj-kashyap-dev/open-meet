import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { ApiEnv } from '@open-meet/config';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  ics?: {
    filename: string;
    content: string;
  };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(private readonly config: ConfigService<ApiEnv, true>) {
    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = this.config.getOrThrow<number>('SMTP_PORT');
    const secure = this.config.get<boolean>('SMTP_SECURE') ?? false;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    this.defaultFrom = this.config.getOrThrow<string>('MAIL_FROM');
  }

  async send(input: SendMailInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.defaultFrom,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.ics
          ? [
              {
                filename: input.ics.filename,
                content: input.ics.content,
                contentType: 'text/calendar; charset=utf-8; method=REQUEST',
              },
            ]
          : undefined,
        alternatives: input.ics
          ? [
              {
                contentType: 'text/calendar; charset=utf-8; method=REQUEST',
                content: input.ics.content,
              },
            ]
          : undefined,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send mail to ${input.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
