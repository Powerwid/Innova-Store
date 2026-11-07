import { type MovimientoCajaInput } from '../compartido/operaciones.types.js';

export interface VentaInput extends MovimientoCajaInput {
  efectivoRecibido?: string;
  claveOperacion?: string;
  idCliente?: number | null;
  productos: Array<{
    idProductoSucursal: number;
    idAlmacen: number;
    cantidad: string;
    precioUnitario: string;
  }>;
  credito?: {
    idCliente: number;
    fechaVencimiento?: string | null;
  } | null;
}
