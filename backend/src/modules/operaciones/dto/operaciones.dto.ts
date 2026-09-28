import { z } from 'zod';

const MAX_ID = 2_147_483_647;
const MAX_PAGINA = 1_000_000;
const MAX_PAGOS = 20;
const MAX_DETALLES = 200;

export const IdSchema = z
  .number({ error: 'El identificador debe ser un número' })
  .int('El identificador debe ser un número entero')
  .positive('El identificador debe ser mayor a cero')
  .max(MAX_ID, 'El identificador excede el límite admitido');

const queryId = z.coerce
  .number({ error: 'El identificador debe ser un número' })
  .int('El identificador debe ser un número entero')
  .positive('El identificador debe ser mayor a cero')
  .max(MAX_ID, 'El identificador excede el límite admitido')
  .optional();

const textoRequerido = (etiqueta: string, max: number) =>
  z
    .string({ error: `${etiqueta} debe ser texto` })
    .trim()
    .min(1, `${etiqueta} es obligatorio`)
    .max(max, `${etiqueta} no puede superar los ${max} caracteres`);

const textoOpcional = (etiqueta: string, max: number) =>
  z
    .string({ error: `${etiqueta} debe ser texto` })
    .trim()
    .max(max, `${etiqueta} no puede superar los ${max} caracteres`)
    .nullable()
    .optional()
    .transform((value) => value || null);

const decimal = (totalDigitos: number, escala: number, etiqueta: string) => {
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

const dineroPositivo = DineroSchema.refine(
  (value) => decimalEscalado(value, 2) > 0n,
  'El monto debe ser mayor a cero',
);
const precioPositivo = PrecioUnitarioSchema.refine(
  (value) => decimalEscalado(value, 4) > 0n,
  'El precio unitario debe ser mayor a cero',
);
const cantidadPositiva = CantidadSchema.refine(
  (value) => decimalEscalado(value, 3) > 0n,
  'La cantidad debe ser mayor a cero',
);
const porcentajePositivo = PorcentajeSchema.refine(
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

function decimalEscalado(value: string, escala: number): bigint {
  const [entero, fraccion = ''] = value.split('.');
  const base = 10n ** BigInt(escala);
  const decimales = (fraccion + '0'.repeat(escala)).slice(0, escala);
  return BigInt(entero) * base + BigInt(decimales || '0');
}

function sumaPagos(pagos: ReadonlyArray<{ monto: string }>): bigint {
  return pagos.reduce(
    (total, pago) => total + decimalEscalado(pago.monto, 2),
    0n,
  );
}

function contieneDuplicados<T>(
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

const filtrosSucursalFecha = {
  idSucursal: queryId,
  desde: FechaHoraSchema.optional(),
  hasta: FechaHoraSchema.optional(),
  buscar: z
    .string({ error: 'La búsqueda debe ser texto' })
    .trim()
    .max(255, 'La búsqueda no puede superar los 255 caracteres')
    .optional(),
};

const validarRango = (value: { desde?: string; hasta?: string }) =>
  !value.desde ||
  !value.hasta ||
  new Date(value.desde).getTime() <= new Date(value.hasta).getTime();

export const ListarOperacionesSchema = PaginacionSchema.extend({
  ...filtrosSucursalFecha,
}).superRefine((value, ctx) => {
  if (!validarRango(value)) {
    ctx.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: 'La fecha final no puede ser anterior a la fecha inicial',
    });
  }
});

export const ListarCajasSchema = PaginacionSchema.extend({
  idSucursal: queryId,
  desde: FechaHoraSchema.optional(),
  hasta: FechaHoraSchema.optional(),
  abierta: z
    .enum(['true', 'false'], {
      error: 'El estado de caja debe ser true o false',
    })
    .transform((value) => value === 'true')
    .optional(),
}).superRefine((value, ctx) => {
  if (!validarRango(value)) {
    ctx.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: 'La fecha final no puede ser anterior a la fecha inicial',
    });
  }
});

export const CajaAbiertaQuerySchema = z
  .object({
    idSucursal: z.coerce
      .number({ error: 'La sucursal debe ser un número' })
      .int('La sucursal debe ser un número entero')
      .positive('La sucursal debe ser mayor a cero')
      .max(MAX_ID, 'La sucursal excede el límite admitido'),
  })
  .strict();

export const ListarIngresosSchema = ListarOperacionesSchema.safeExtend({
  idCaja: queryId,
  idMotivoIngreso: queryId,
});

export const ListarEgresosSchema = ListarOperacionesSchema.safeExtend({
  idCaja: queryId,
  idMotivoEgreso: queryId,
  idCompra: queryId,
});

export const ListarComprasSchema = ListarOperacionesSchema.safeExtend({
  idProveedor: queryId,
  idAlmacen: queryId,
});

export const ListarDeudasSchema = ListarOperacionesSchema.safeExtend({
  idCliente: queryId,
  estado: z
    .enum(['PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA'], {
      error: 'El estado de la deuda no es válido',
    })
    .optional(),
});

export const ListarCatalogosSchema = PaginacionSchema.extend({
  buscar: z
    .string({ error: 'La búsqueda debe ser texto' })
    .trim()
    .max(100, 'La búsqueda no puede superar los 100 caracteres')
    .optional(),
  activo: z
    .enum(['true', 'false'], { error: 'El estado debe ser true o false' })
    .transform((value) => value === 'true')
    .optional(),
});

export const ListarTiposComprobanteSchema = ListarCatalogosSchema.omit({
  activo: true,
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

export const AbrirCajaSchema = z
  .object({
    idSucursal: IdSchema,
    montoApertura: DineroSchema,
    detalles: PagosOpcionalesSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.detalles) !== decimalEscalado(value.montoApertura, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['detalles'],
        message:
          'La suma de los saldos iniciales debe coincidir con el monto de apertura',
      });
    }
  });

export const CerrarCajaSchema = z
  .object({
    montoCierre: DineroSchema,
  })
  .strict();

const motivoSchema = z
  .object({
    motivo: textoRequerido('El motivo', 100),
    activo: z
      .boolean({ error: 'El estado activo debe ser verdadero o falso' })
      .default(true),
  })
  .strict();

const actualizarMotivoSchema = z
  .object({
    motivo: textoRequerido('El motivo', 100).optional(),
    activo: z
      .boolean({ error: 'El estado activo debe ser verdadero o falso' })
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((campo) => campo !== undefined),
    'Debe enviar al menos un campo',
  );

export const MotivoIngresoSchema = motivoSchema;
export const ActualizarMotivoIngresoSchema = actualizarMotivoSchema;
export const MotivoEgresoSchema = motivoSchema;
export const ActualizarMotivoEgresoSchema = actualizarMotivoSchema;

export const TipoComprobanteSchema = z
  .object({
    nombre: textoRequerido('El nombre', 100),
    codigoSunat: z
      .string({ error: 'El código SUNAT debe ser texto' })
      .trim()
      .regex(/^\d{2}$/, 'El código SUNAT debe tener exactamente 2 dígitos')
      .nullable()
      .optional()
      .transform((value) => value || null),
  })
  .strict();

export const ActualizarTipoComprobanteSchema = z
  .object({
    nombre: textoRequerido('El nombre', 100).optional(),
    codigoSunat: z
      .string({ error: 'El código SUNAT debe ser texto' })
      .trim()
      .regex(/^\d{2}$/, 'El código SUNAT debe tener exactamente 2 dígitos')
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((campo) => campo !== undefined),
    'Debe enviar al menos un campo',
  );

export const CrearIngresoSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    idMotivoIngreso: IdSchema,
    monto: dineroPositivo,
    detalle: textoOpcional('El detalle', 500),
    fechaIngreso: FechaHoraSchema.optional(),
    pagos: PagosSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos debe coincidir con el monto del ingreso',
      });
    }
  });

export const CrearEgresoSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    idMotivoEgreso: IdSchema,
    monto: dineroPositivo,
    detalle: textoOpcional('El detalle', 500),
    fechaEgreso: FechaHoraSchema.optional(),
    pagos: PagosSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos debe coincidir con el monto del egreso',
      });
    }
  });

export const VentaProductoSchema = z
  .object({
    idProductoSucursal: IdSchema,
    idAlmacen: IdSchema,
    cantidad: cantidadPositiva,
    precioUnitario: precioPositivo,
  })
  .strict();

export const CreditoVentaSchema = z
  .object({
    idCliente: IdSchema,
    fechaVencimiento: FechaSchema.nullable().optional(),
  })
  .strict();

export const CrearVentaSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    monto: dineroPositivo,
    detalle: textoOpcional('El detalle', 500),
    fechaIngreso: FechaHoraSchema.optional(),
    productos: z
      .array(VentaProductoSchema, {
        error: 'Los productos deben enviarse en una lista',
      })
      .min(1, 'La venta debe contener al menos un producto')
      .max(
        MAX_DETALLES,
        `La venta no puede contener más de ${MAX_DETALLES} productos`,
      )
      .superRefine((productos, ctx) => {
        if (
          contieneDuplicados(
            productos,
            (producto) =>
              `${producto.idProductoSucursal}:${producto.idAlmacen}`,
          )
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'No puede repetir el mismo producto y almacén',
          });
        }
      }),
    pagos: PagosOpcionalesSchema,
    credito: CreditoVentaSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const pagado = sumaPagos(value.pagos);
    const total = decimalEscalado(value.monto, 2);

    if (pagado > total) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos no puede superar el total de la venta',
      });
    } else if (pagado < total && !value.credito) {
      ctx.addIssue({
        code: 'custom',
        path: ['credito'],
        message:
          'Debe indicar el cliente cuando la venta deja un saldo a crédito',
      });
    }
  });

export const CompraDetalleSchema = z
  .object({
    idProductoSucursal: IdSchema,
    cantidad: cantidadPositiva,
    precioUnitario: precioPositivo,
  })
  .strict();

export const ComprobanteCompraSchema = z
  .object({
    idTipoComprobante: IdSchema,
    serie: textoOpcional('La serie', 20),
    numero: textoOpcional('El número', 40),
    fechaEmision: FechaSchema,
  })
  .strict();

const percepcionBase = {
  fechaPercepcion: FechaSchema,
  baseCalculo: dineroPositivo,
  porcentaje: porcentajePositivo,
  monto: dineroPositivo,
  numeroConstancia: textoOpcional('El número de constancia', 80),
  pagos: PagosSchema,
};

export const PercepcionCompraSchema = z
  .object(percepcionBase)
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message:
          'La suma de los pagos debe coincidir con el monto de la percepción',
      });
    }
  });

export const CrearPercepcionSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    ...percepcionBase,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message:
          'La suma de los pagos debe coincidir con el monto de la percepción',
      });
    }
  });

export const CrearCompraSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    idAlmacen: IdSchema,
    idProveedor: IdSchema.nullable().optional(),
    nombreProveedor: textoRequerido('El nombre del proveedor', 255),
    fechaCompra: FechaHoraSchema.optional(),
    subtotal: DineroSchema.nullable().optional(),
    igv: DineroSchema.nullable().optional(),
    total: dineroPositivo,
    detalles: z
      .array(CompraDetalleSchema, {
        error: 'Los detalles deben enviarse en una lista',
      })
      .min(1, 'La compra debe contener al menos un producto')
      .max(
        MAX_DETALLES,
        `La compra no puede contener más de ${MAX_DETALLES} productos`,
      )
      .superRefine((detalles, ctx) => {
        if (
          contieneDuplicados(detalles, (detalle) => detalle.idProductoSucursal)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'No puede repetir un producto en la compra',
          });
        }
      }),
    comprobante: ComprobanteCompraSchema.nullable().optional(),
    pagos: PagosOpcionalesSchema,
    percepcion: PercepcionCompraSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const subtotalInformado = value.subtotal != null;
    const igvInformado = value.igv != null;
    if (subtotalInformado !== igvInformado) {
      ctx.addIssue({
        code: 'custom',
        path: [subtotalInformado ? 'igv' : 'subtotal'],
        message: 'El subtotal y el IGV deben informarse juntos',
      });
    } else if (
      subtotalInformado &&
      igvInformado &&
      decimalEscalado(value.subtotal!, 2) + decimalEscalado(value.igv!, 2) !==
        decimalEscalado(value.total, 2)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'El total debe ser igual al subtotal más el IGV',
      });
    }

    if (sumaPagos(value.pagos) > decimalEscalado(value.total, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos no puede superar el total de la compra',
      });
    }
  });

export const PagoCompraSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    monto: dineroPositivo.optional(),
    detalle: textoOpcional('El detalle', 500),
    fechaEgreso: FechaHoraSchema.optional(),
    pagos: PagosSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.monto !== undefined &&
      sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos debe coincidir con el monto pagado',
      });
    }
  });

export const CrearAbonoDeudaSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    monto: dineroPositivo,
    detalle: textoOpcional('El detalle', 500),
    fechaIngreso: FechaHoraSchema.optional(),
    pagos: PagosSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos debe coincidir con el monto del abono',
      });
    }
  });

export type PaginacionDto = z.infer<typeof PaginacionSchema>;
export type ListarOperacionesDto = z.infer<typeof ListarOperacionesSchema>;
export type ListarCajasDto = z.infer<typeof ListarCajasSchema>;
export type CajaAbiertaQueryDto = z.infer<typeof CajaAbiertaQuerySchema>;
export type ListarIngresosDto = z.infer<typeof ListarIngresosSchema>;
export type ListarEgresosDto = z.infer<typeof ListarEgresosSchema>;
export type ListarComprasDto = z.infer<typeof ListarComprasSchema>;
export type ListarDeudasDto = z.infer<typeof ListarDeudasSchema>;
export type PagoDto = z.infer<typeof PagoSchema>;
export type AbrirCajaDto = z.infer<typeof AbrirCajaSchema>;
export type CerrarCajaDto = z.infer<typeof CerrarCajaSchema>;
export type MotivoIngresoDto = z.infer<typeof MotivoIngresoSchema>;
export type ActualizarMotivoIngresoDto = z.infer<
  typeof ActualizarMotivoIngresoSchema
>;
export type MotivoEgresoDto = z.infer<typeof MotivoEgresoSchema>;
export type ActualizarMotivoEgresoDto = z.infer<
  typeof ActualizarMotivoEgresoSchema
>;
export type TipoComprobanteDto = z.infer<typeof TipoComprobanteSchema>;
export type ActualizarTipoComprobanteDto = z.infer<
  typeof ActualizarTipoComprobanteSchema
>;
export type CrearIngresoDto = z.infer<typeof CrearIngresoSchema>;
export type CrearEgresoDto = z.infer<typeof CrearEgresoSchema>;
export type CrearVentaDto = z.infer<typeof CrearVentaSchema>;
export type CrearCompraDto = z.infer<typeof CrearCompraSchema>;
export type PagoCompraDto = z.infer<typeof PagoCompraSchema>;
export type CrearPercepcionDto = z.infer<typeof CrearPercepcionSchema>;
export type CrearAbonoDeudaDto = z.infer<typeof CrearAbonoDeudaSchema>;
