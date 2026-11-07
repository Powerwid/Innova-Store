import { z } from 'zod';

export const MAX_ID = 2_147_483_647;

export const MAX_PAGINA = 1_000_000;

export const MAX_PAGOS = 20;

export const MAX_DETALLES = 200;

export const IdSchema = z
  .number({ error: 'El identificador debe ser un número' })
  .int('El identificador debe ser un número entero')
  .positive('El identificador debe ser mayor a cero')
  .max(MAX_ID, 'El identificador excede el límite admitido');

export const queryId = z.coerce
  .number({ error: 'El identificador debe ser un número' })
  .int('El identificador debe ser un número entero')
  .positive('El identificador debe ser mayor a cero')
  .max(MAX_ID, 'El identificador excede el límite admitido')
  .optional();

export const textoRequerido = (etiqueta: string, max: number) =>
  z
    .string({ error: `${etiqueta} debe ser texto` })
    .trim()
    .min(1, `${etiqueta} es obligatorio`)
    .max(max, `${etiqueta} no puede superar los ${max} caracteres`);

export const textoOpcional = (etiqueta: string, max: number) =>
  z
    .string({ error: `${etiqueta} debe ser texto` })
    .trim()
    .max(max, `${etiqueta} no puede superar los ${max} caracteres`)
    .nullable()
    .optional()
    .transform((value) => value || null);

export const decimal = (
  totalDigitos: number,
  escala: number,
  etiqueta: string,
) => {
  const enteros = totalDigitos - escala;
  const patron = new RegExp(`^\\d{1,${enteros}}(?:\\.\\d{1,${escala}})?$`);

  return z.preprocess(
    (value) => {
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string') return value.trim();
      return value;
    },
    z
      .string({ error: `${etiqueta} debe ser un número decimal` })
      .regex(
        patron,
        `${etiqueta} admite hasta ${enteros} enteros y ${escala} decimales, sin signo`,
      ),
  );
};

export const DineroSchema = decimal(14, 2, 'El monto');

export const PrecioUnitarioSchema = decimal(14, 4, 'El precio unitario');

export const CantidadSchema = decimal(14, 3, 'La cantidad');

export const PorcentajeSchema = decimal(6, 3, 'El porcentaje').refine(
  (value) => Number(value) <= 100,
  'El porcentaje no puede superar 100',
);

export const dineroPositivo = DineroSchema.refine(
  (value) => decimalEscalado(value, 2) > 0n,
  'El monto debe ser mayor a cero',
);

export const precioPositivo = PrecioUnitarioSchema.refine(
  (value) => decimalEscalado(value, 4) > 0n,
  'El precio unitario debe ser mayor a cero',
);

export const cantidadPositiva = CantidadSchema.refine(
  (value) => decimalEscalado(value, 3) > 0n,
  'La cantidad debe ser mayor a cero',
);

export const porcentajePositivo = PorcentajeSchema.refine(
  (value) => decimalEscalado(value, 3) > 0n,
  'El porcentaje debe ser mayor a cero',
);

export const FechaHoraSchema = z.iso.datetime({
  offset: true,
  error: 'La fecha y hora debe tener formato ISO 8601 e incluir zona horaria',
});

export const FechaSchema = z.iso.date({
  error: 'La fecha debe tener formato YYYY-MM-DD y ser válida',
});

export function decimalEscalado(value: string, escala: number): bigint {
  const [entero, fraccion = ''] = value.split('.');
  const base = 10n ** BigInt(escala);
  const decimales = (fraccion + '0'.repeat(escala)).slice(0, escala);
  return BigInt(entero) * base + BigInt(decimales || '0');
}

export function sumaPagos(pagos: ReadonlyArray<{ monto: string }>): bigint {
  return pagos.reduce(
    (total, pago) => total + decimalEscalado(pago.monto, 2),
    0n,
  );
}

export function contieneDuplicados<T>(
  elementos: ReadonlyArray<T>,
  clave: (elemento: T) => string | number,
): boolean {
  return new Set(elementos.map(clave)).size !== elementos.length;
}

export const PaginacionSchema = z
  .object({
    pagina: z.coerce
      .number({ error: 'La página debe ser un número' })
      .int('La página debe ser un número entero')
      .min(1, 'La página debe ser mayor o igual a 1')
      .max(MAX_PAGINA, 'La página excede el límite admitido')
      .default(1),
    limite: z.coerce
      .number({ error: 'El límite debe ser un número' })
      .int('El límite debe ser un número entero')
      .min(1, 'El límite debe ser mayor o igual a 1')
      .max(100, 'El límite no puede superar 100')
      .default(50),
  })
  .strict();

export const filtrosSucursalFecha = {
  idSucursal: queryId,
  desde: FechaHoraSchema.optional(),
  hasta: FechaHoraSchema.optional(),
  buscar: z
    .string({ error: 'La búsqueda debe ser texto' })
    .trim()
    .max(255, 'La búsqueda no puede superar los 255 caracteres')
    .optional(),
};

export const validarRango = (value: { desde?: string; hasta?: string }) =>
  !value.desde ||
  !value.hasta ||
  new Date(value.desde).getTime() <= new Date(value.hasta).getTime();

export const ListarOperacionesSchema = PaginacionSchema.extend({
  ...filtrosSucursalFecha,
  idCaja: queryId,
}).superRefine((value, ctx) => {
  if (!validarRango(value)) {
    ctx.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: 'La fecha final no puede ser anterior a la fecha inicial',
    });
  }
});

export const PagoSchema = z
  .object({
    idMedioPago: IdSchema,
    monto: dineroPositivo,
  })
  .strict();

export const PagoMedioSchema = PagoSchema;

export const PagosSchema = z
  .array(PagoSchema, { error: 'Los pagos deben enviarse en una lista' })
  .min(1, 'Debe registrar al menos un medio de pago')
  .max(MAX_PAGOS, `No puede registrar más de ${MAX_PAGOS} medios de pago`)
  .superRefine((pagos, ctx) => {
    if (contieneDuplicados(pagos, (pago) => pago.idMedioPago)) {
      ctx.addIssue({
        code: 'custom',
        message: 'No puede repetir un medio de pago',
      });
    }
  });

export const PagosOpcionalesSchema = z
  .array(PagoSchema, { error: 'Los pagos deben enviarse en una lista' })
  .max(MAX_PAGOS, `No puede registrar más de ${MAX_PAGOS} medios de pago`)
  .superRefine((pagos, ctx) => {
    if (contieneDuplicados(pagos, (pago) => pago.idMedioPago)) {
      ctx.addIssue({
        code: 'custom',
        message: 'No puede repetir un medio de pago',
      });
    }
  });

export type PaginacionDto = z.infer<typeof PaginacionSchema>;

export type ListarOperacionesDto = z.infer<typeof ListarOperacionesSchema>;

export type PagoDto = z.infer<typeof PagoSchema>;
