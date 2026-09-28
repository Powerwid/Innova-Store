import { z } from 'zod';

const id = z.number().int().positive().max(2147483647);
const nombre = (max: number) => z.string().trim().min(1).max(max);
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);
const decimal = (escala: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine(
      (v) =>
        new RegExp(
          '^\\d{1,' + (14 - escala) + '}(?:\\.\\d{1,' + escala + '})?$',
        ).test(v),
      'Debe ser un decimal positivo o cero, dentro del tamaño y precisión admitidos',
    );
export const CantidadSchema = decimal(3);
export const PrecioSchema = decimal(2);
export const TipoAlmacenSchema = z.enum(['ALMACEN', 'AREA_VENTA'], {
  error: 'El tipo de almacén debe ser ALMACEN o AREA_VENTA',
});

export const TipoProductoSchema = z
  .object({ nombre: nombre(100), estado: z.boolean().default(true) })
  .strict();
export const CategoriaSchema = TipoProductoSchema.extend({
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color como #F58220')
    .nullable()
    .optional(),
});
export const UnidadMedidaSchema = z
  .object({
    nombre: nombre(50),
    simbolo: nombre(10),
    estado: z.boolean().default(true),
  })
  .strict();
export const ProductoSchema = z
  .object({
    idTipoProducto: id,
    idCategoria: id,
    idUnidadMedida: id,
    nombre: nombre(255),
    detalle: opcional(500).optional(),
    codigoBarras: opcional(100).optional(),
    imagen: opcional(255).optional(),
    estado: z.boolean().default(true),
  })
  .strict();
export const ProductoSucursalSchema = z
  .object({
    idProducto: id,
    idSucursal: id,
    precioCompra: PrecioSchema.default('0'),
    precioVenta: PrecioSchema.default('0'),
    estado: z.boolean().default(true),
  })
  .strict();
export const AlmacenSchema = z
  .object({
    idSucursal: id,
    nombre: nombre(100),
    tipo: TipoAlmacenSchema.default('ALMACEN'),
    direccion: opcional(255).optional(),
    estado: z.boolean().default(true),
  })
  .strict();
export const InventarioSchema = z
  .object({
    idProductoSucursal: id,
    idAlmacen: id,
    stockMinimo: CantidadSchema.default('0'),
    stockInicial: CantidadSchema.default('0'),
  })
  .strict();
export const MovimientoSchema = z
  .object({
    idInventario: id,
    idTipoMovimiento: id,
    cantidad: CantidadSchema.refine(
      (v) => Number(v) > 0,
      'La cantidad debe ser mayor a cero',
    ),
    observacion: opcional(500).optional(),
  })
  .strict();

const noVacio = (v: object) =>
  Object.values(v).some((value) => value !== undefined);
// PATCH no debe aplicar los defaults de creación a campos omitidos.
const estadoOpcional = { estado: z.boolean().optional() };
export const ActualizarTipoProductoSchema = TipoProductoSchema.partial()
  .extend(estadoOpcional)
  .refine(noVacio, 'Envía al menos un campo');
export const ActualizarCategoriaSchema = CategoriaSchema.partial()
  .extend(estadoOpcional)
  .refine(noVacio, 'Envía al menos un campo');
export const ActualizarUnidadMedidaSchema = UnidadMedidaSchema.partial()
  .extend(estadoOpcional)
  .refine(noVacio, 'Envía al menos un campo');
export const ActualizarProductoSchema = ProductoSchema.partial()
  .extend(estadoOpcional)
  .refine(noVacio, 'Envía al menos un campo');
export const ActualizarProductoSucursalSchema = ProductoSucursalSchema.omit({
  idProducto: true,
  idSucursal: true,
})
  .partial()
  .extend({
    ...estadoOpcional,
    precioCompra: PrecioSchema.optional(),
    precioVenta: PrecioSchema.optional(),
  })
  .refine(noVacio, 'Envía al menos un campo');
export const ActualizarAlmacenSchema = AlmacenSchema.omit({ idSucursal: true })
  .partial()
  .extend({
    ...estadoOpcional,
    tipo: TipoAlmacenSchema.optional(),
  })
  .refine(noVacio, 'Envía al menos un campo');
export const ActualizarInventarioSchema = z
  .object({ stockMinimo: CantidadSchema })
  .strict();

export const ActualizarConfiguracionGlobalSchema = z
  .object({
    activo: z.boolean(),
  })
  .strict();

const queryId = z.coerce.number().int().positive().max(2147483647).optional();
export const ListarSchema = z
  .object({
    buscar: z.string().trim().max(255).optional(),
    estado: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    pagina: z.coerce.number().int().min(1).max(1000000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export const ListarProductosSchema = ListarSchema.extend({
  idCategoria: queryId,
  idTipoProducto: queryId,
});
export const ListarSucursalesSchema = ListarSchema.extend({
  idSucursal: queryId,
});
export const ListarProductoSucursalSchema = ListarSucursalesSchema.extend({
  idProducto: queryId,
});
export const ListarInventariosSchema = ListarSchema.omit({
  estado: true,
}).extend({
  idSucursal: queryId,
  idAlmacen: queryId,
  idProducto: queryId,
});
export const ListarMovimientosSchema = ListarInventariosSchema.extend({
  idInventario: queryId,
  idTipoMovimiento: queryId,
  desde: z.iso.datetime({ offset: true }).optional(),
  hasta: z.iso.datetime({ offset: true }).optional(),
}).refine(
  (v) => !v.desde || !v.hasta || new Date(v.desde) <= new Date(v.hasta),
  'El rango de fechas es inválido',
);

export type TipoProductoDto = z.infer<typeof TipoProductoSchema>;
export type CategoriaDto = z.infer<typeof CategoriaSchema>;
export type UnidadMedidaDto = z.infer<typeof UnidadMedidaSchema>;
export type ProductoDto = z.infer<typeof ProductoSchema>;
export type ProductoSucursalDto = z.infer<typeof ProductoSucursalSchema>;
export type AlmacenDto = z.infer<typeof AlmacenSchema>;
export type InventarioDto = z.infer<typeof InventarioSchema>;
export type MovimientoDto = z.infer<typeof MovimientoSchema>;
export type ListarDto = z.infer<typeof ListarSchema> & {
  idSucursal?: number;
  idAlmacen?: number;
  idProducto?: number;
  idInventario?: number;
  idCategoria?: number;
  idTipoProducto?: number;
  idTipoMovimiento?: number;
  desde?: string;
  hasta?: string;
};
