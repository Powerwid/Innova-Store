import type { PagoPayload } from './operaciones.types';

interface MedioDisponible {
  idMedioPago: number;
  nombre: string;
}

export function pagoPredeterminado(
  medios: readonly MedioDisponible[],
  monto: number,
): PagoPayload[] {
  const disponibles = medios.filter((medio) => medio.nombre.trim().toLowerCase() !== 'fraccionado');
  const medio =
    disponibles.find((item) => item.nombre.trim().toLowerCase() === 'efectivo') ?? disponibles[0];
  return medio ? [{ idMedioPago: medio.idMedioPago, monto: monto.toFixed(2) }] : [];
}

export function completarPagoAutomatico(
  pagos: PagoPayload[],
  monto: number,
  automatico: boolean,
): PagoPayload[] {
  if (!automatico || pagos.length !== 1) return pagos;
  const actualizado = monto.toFixed(2);
  return pagos[0]!.monto === actualizado ? pagos : [{ ...pagos[0]!, monto: actualizado }];
}
