import { SetMetadata } from '@nestjs/common';
import { RolSistema } from '../enums/rol-sistema.enum.js';

export const SOLO_SUPERADMIN_KEY = 'solo_superadmin';
export const SoloSuperadmin = () =>
  SetMetadata(SOLO_SUPERADMIN_KEY, RolSistema.SUPERADMIN);
