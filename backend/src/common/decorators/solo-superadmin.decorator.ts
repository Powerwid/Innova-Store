import { SetMetadata } from '@nestjs/common';

export const SOLO_SUPERADMIN_KEY = 'solo_superadmin';
export const SoloSuperadmin = () => SetMetadata(SOLO_SUPERADMIN_KEY, true);
