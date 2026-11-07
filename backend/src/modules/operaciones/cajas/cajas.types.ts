import { type MovimientoCajaInput } from '../compartido/operaciones.types.js';

export interface AbrirCajaInput {
  idSucursal: number;
  montoApertura: string;
}

export interface CerrarCajaInput {
  montoCierre: string;
}

export interface IngresoInput extends MovimientoCajaInput {
  idMotivoIngreso: number;
}

export interface EgresoInput extends MovimientoCajaInput {
  idMotivoEgreso: number;
}
