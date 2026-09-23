import { SetMetadata } from '@nestjs/common';

export const ESTADOS_PERMITIDOS_KEY = 'estados_permitidos';
export const EstadosPermitidos = (...estados: string[]) =>
  SetMetadata(ESTADOS_PERMITIDOS_KEY, estados);
