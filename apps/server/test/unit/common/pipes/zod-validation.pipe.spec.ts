import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z, type ZodSchema } from 'zod';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

const schema = z.object({ name: z.string(), age: z.number().int() });

describe('ZodValidationPipe', () => {
  describe('transform()', () => {
    it('should return the parsed value when valid', () => {
      const pipe = new ZodValidationPipe(schema);
      expect(pipe.transform({ name: 'a', age: 3 })).toEqual({ name: 'a', age: 3 });
    });

    it('should throw a BadRequest with flattened issues on a ZodError', () => {
      const pipe = new ZodValidationPipe(schema);
      try {
        pipe.transform({ name: 1, age: 'x' });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const body = (err as BadRequestException).getResponse() as {
          code: string;
          issues: Array<{ path: string; message: string }>;
        };
        expect(body.code).toBe('VALIDATION_FAILED');
        expect(body.issues.map((i) => i.path).sort()).toEqual(['age', 'name']);
      }
    });

    it('should rethrow non-Zod errors unchanged', () => {
      const exploding = {
        parse: () => {
          throw new Error('boom');
        },
      } as unknown as ZodSchema;
      const pipe = new ZodValidationPipe(exploding);
      expect(() => pipe.transform({})).toThrow('boom');
    });
  });
});
