import { SetMetadata } from '@nestjs/common';
import type { ParticipantRole } from '@open-meet/types';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: ParticipantRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
