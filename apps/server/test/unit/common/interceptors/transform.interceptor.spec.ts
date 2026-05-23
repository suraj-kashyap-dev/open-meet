import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';

describe('TransformInterceptor', () => {
  let getAllAndOverride: ReturnType<typeof vi.fn>;

  let interceptor: TransformInterceptor;

  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  beforeEach(() => {
    getAllAndOverride = vi.fn().mockReturnValue(undefined);
    interceptor = new TransformInterceptor({ getAllAndOverride } as unknown as Reflector);
  });

  describe('intercept()', () => {
    it('should wrap handler output in the success envelope with a timestamp', async () => {
      const next: CallHandler = { handle: () => of({ id: 'x' }) };
      const result = await firstValueFrom(interceptor.intercept(context, next));
      expect(result).toMatchObject({ success: true, data: { id: 'x' } });
      expect(typeof (result as { meta: { timestamp: string } }).meta.timestamp).toBe('string');
    });

    it('should pass the payload through untouched when @SkipTransform is set', async () => {
      getAllAndOverride.mockReturnValueOnce(true);
      const next: CallHandler = { handle: () => of('raw-stream') };
      const result = await firstValueFrom(interceptor.intercept(context, next));
      expect(result).toBe('raw-stream');
    });
  });
});
