import { SetMetadata } from '@nestjs/common';

export const AUTENTICADO_KEY = 'autenticado';
export const Autenticado = () => SetMetadata(AUTENTICADO_KEY, true);
