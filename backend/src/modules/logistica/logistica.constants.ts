export const MOVIMIENTO_INICIAL = 1;
export const CONFIG_STOCK_NEGATIVO = 'STOCK_NEGATIVO';
export const TIPOS_MOVIMIENTO = [
  {
    idTipoMovimiento: MOVIMIENTO_INICIAL,
    nombre: 'Stock inicial',
    entradaSalida: 'ENTRADA',
  },
  {
    idTipoMovimiento: 2,
    nombre: 'Ajuste de entrada',
    entradaSalida: 'ENTRADA',
  },
  { idTipoMovimiento: 3, nombre: 'Ajuste de salida', entradaSalida: 'SALIDA' },
  { idTipoMovimiento: 4, nombre: 'Merma', entradaSalida: 'SALIDA' },
] as const;
