import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { MailService } from '@/integrations/mail/mail.service';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock('nodemailer', () => ({ createTransport: vi.fn(() => ({ sendMail })) }));

const config = {
  getOrThrow: (k: string) =>
    ({ SMTP_HOST: 'localhost', SMTP_PORT: 1025, MAIL_FROM: 'noreply@open-meet.test' })[k],
  get: () => undefined,
} as unknown as ConfigService<ApiEnv, true>;

describe('MailService', () => {
  let service: MailService;

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined);
    service = new MailService(config);
  });

  describe('send()', () => {
    it('should send with the configured from address and forward the message fields', async () => {
      await service.send({ to: 'a@x.com', subject: 'Hi', text: 'body', html: '<p>body</p>' });
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@open-meet.test',
          to: 'a@x.com',
          subject: 'Hi',
          text: 'body',
          html: '<p>body</p>',
          attachments: undefined,
          alternatives: undefined,
        }),
      );
    });

    it('should attach a calendar invite as both an attachment and an alternative when ics is given', async () => {
      await service.send({
        to: 'a@x.com',
        subject: 'Invite',
        text: 'body',
        ics: { filename: 'invite.ics', content: 'BEGIN:VCALENDAR' },
      });
      const arg = sendMail.mock.calls[0][0];
      expect(arg.attachments[0]).toMatchObject({
        filename: 'invite.ics',
        content: 'BEGIN:VCALENDAR',
      });
      expect(arg.alternatives[0].content).toBe('BEGIN:VCALENDAR');
    });

    it('should rethrow when the transport fails', async () => {
      sendMail.mockRejectedValueOnce(new Error('smtp down'));
      await expect(service.send({ to: 'a@x.com', subject: 's', text: 't' })).rejects.toThrow(
        'smtp down',
      );
    });
  });
});
