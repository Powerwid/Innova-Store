import { Prisma } from '../../../generated/prisma/client.js';

export type Db = Prisma.TransactionClient;

export type DecimalValue = string | number;

export interface PagoInput {
  idMedioPago: number;
  monto: string;
}

export interface ConsultaPaginada {
  pagina: number;
  limite: number;
  buscar?: string;
  activo?: boolean;
  abierta?: boolean;
  idSucursal?: number;
  idCaja?: number;
  idCliente?: number;
  idMotivoIngreso?: number;
  idMotivoEgreso?: number;
  idCompra?: number;
  idProveedor?: number;
  idAlmacen?: number;
  desde?: string;
  hasta?: string;
  estado?: string;
}

export interface MovimientoCajaInput {
  idCaja: number;
  idSucursal: number;
  monto: string;
  detalle?: string | null;
  pagos: PagoInput[];
  fechaIngreso?: string;
  fechaEgreso?: string;
}
