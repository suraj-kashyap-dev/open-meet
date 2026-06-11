import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { ApiError } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const body: ApiError = {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        statusCode: normalized.status,
        ...(normalized.details !== undefined ? { details: normalized.details } : {}),
      },
    };

    reply.status(normalized.status).send(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      let message = exception.message;
      let code = this.codeForStatus(status);
      let details: unknown;

      if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;

        if (typeof r.message === 'string') {
          message = r.message;
        } else if (Array.isArray(r.message)) {
          message = 'Validation failed';

          code = ApiErrorCode.VALIDATION_FAILED;

          details = r.message;
        }

        if (typeof r.code === 'string') {
          code = r.code;
        }
      } else if (typeof response === 'string') {
        message = response;
      }

      return { status, code, message, details };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.RATE_LIMITED;
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.VALIDATION_FAILED;
      default:
        return ApiErrorCode.INTERNAL_ERROR;
    }
  }
}
