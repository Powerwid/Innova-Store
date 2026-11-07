import {
  type MovimientoCajaInput,
  type PagoInput,
} from '../compartido/operaciones.types.js';

export interface ComprobanteInput {
  idTipoComprobante: number;
  serie?: string | null;
  numero?: string | null;
  fechaEmision: string;
}

export interface PercepcionInput {
  fechaPercepcion: string;
  baseCalculo: string;
  porcentaje: string;
  monto: string;
  numeroConstancia?: string | null;
  pagos: PagoInput[];
}

export interface CompraInput {
  idCaja: number;
  idSucursal: number;
  idAlmacen: number;
  idProveedor?: number | null;
  nombreProveedor: string;
  fechaCompra?: string;
  subtotal?: string | null;
  igv?: string | null;
  total: string;
  detalles: Array<{
    idProductoSucursal: number;
    cantidad: string;
    precioUnitario: string;
  }>;
  comprobante?: ComprobanteInput | null;
  pagos: PagoInput[];
  percepcion?: PercepcionInput | null;
}

export type PagoCompraInput = Omit<MovimientoCajaInput, 'monto'> & {
  monto?: string;
};

export interface CrearPercepcionInput extends PercepcionInput {
  idCaja: number;
  idSucursal: number;
}
