import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  type ArgumentsHost,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let send: ReturnType<typeof vi.fn>;
  let status: ReturnType<typeof vi.fn>;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    send = vi.fn();
    status = vi.fn(() => ({ send }));
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
  });

  const caught = () => send.mock.calls[0][0];

  describe('catch()', () => {
    it('should use the code and message embedded in an HttpException response object', () => {
      filter.catch(new NotFoundException({ code: 'MEETING_NOT_FOUND', message: 'gone' }), host);
      expect(status).toHaveBeenCalledWith(404);
      expect(caught()).toEqual({
        success: false,
        error: { code: 'MEETING_NOT_FOUND', message: 'gone', statusCode: 404 },
      });
    });

    it('should treat an array message as a validation failure and attach the details', () => {
      filter.catch(new BadRequestException({ message: ['a must be a string'] }), host);
      expect(caught().error).toEqual({
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        statusCode: 400,
        details: ['a must be a string'],
      });
    });

    it('should map the status to a fallback code when none is provided (403 -> UNAUTHORIZED)', () => {
      filter.catch(new ForbiddenException(), host);
      expect(status).toHaveBeenCalledWith(403);
      expect(caught().error.code).toBe('UNAUTHORIZED');
    });

    it('should pass through a raw string HttpException message', () => {
      filter.catch(new HttpException('teapot', 418), host);
      expect(status).toHaveBeenCalledWith(418);
      expect(caught().error.message).toBe('teapot');
    });

    it('should hide internals behind a 500 for non-HttpException errors', () => {
      filter.catch(new Error('stack trace leak'), host);
      expect(status).toHaveBeenCalledWith(500);
      expect(caught().error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        statusCode: 500,
      });
    });
  });
});
