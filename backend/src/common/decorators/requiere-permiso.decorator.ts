import { SetMetadata } from '@nestjs/common';

export const PERMISOS_KEY = 'permisos_requeridos';
export const RequierePermiso = (...permisos: string[]) =>
  SetMetadata(PERMISOS_KEY, permisos);
