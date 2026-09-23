import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles_requeridos';
export const RequiereRol = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
