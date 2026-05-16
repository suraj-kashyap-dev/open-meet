import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/** Opt out of the global response-envelope transform (e.g. for webhooks). */
export const SkipTransform = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_TRANSFORM_KEY, true);
