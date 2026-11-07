import { ForbiddenException } from '@nestjs/common';
import { type UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  type ConsultaPaginada,
  type DecimalValue,
  type PagoInput,
} from './operaciones.types.js';

export function paginar(q: ConsultaPaginada) {
  return { skip: (q.pagina - 1) * q.limite, take: q.limite };
}

export async function pagina<T>(
  q: ConsultaPaginada,
  datos: Promise<T[]>,
  cantidad: Promise<number>,
) {
  const [data, total] = await Promise.all([datos, cantidad]);
  return { data, total, pagina: q.pagina, limite: q.limite };
}

export function decimal(value: DecimalValue) {
  return new Prisma.Decimal(value);
}

export function dinero(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function sumarPagos(pagos: PagoInput[]) {
  return pagos.reduce(
    (total, pago) => total.plus(pago.monto),
    new Prisma.Decimal(0),
  );
}

export function fecha(value?: string) {
  return value ? new Date(value) : undefined;
}

export function sucursales(q: ConsultaPaginada, actor: UsuarioAutenticado) {
  if (q.idSucursal !== undefined && !actor.sucursales.includes(q.idSucursal)) {
    throw new ForbiddenException('No tiene acceso a esta sucursal');
  }
  return q.idSucursal ?? { in: actor.sucursales };
}
