export const usuarioSelect = {
  idUsuario: true,
  correo: true,
  perfil: { select: { nombres: true, apellidos: true } },
} as const;

export const cajaInclude = {
  sucursal: true,
  usuarioApertura: { select: usuarioSelect },
  usuarioCierre: { select: usuarioSelect },
  detalles: { include: { medioPago: true }, orderBy: { idMedioPago: 'asc' } },
} as const;

export const ingresoInclude = {
  cliente: { include: { tipoDocumento: true } },
  caja: true,
  sucursal: true,
  motivoIngreso: true,
  usuario: { select: usuarioSelect },
  pagos: { include: { medioPago: true }, orderBy: { idMedioPago: 'asc' } },
  productos: {
    include: {
      productoSucursal: {
        include: { producto: { include: { unidadMedida: true } } },
      },
      almacen: true,
    },
    orderBy: { idIngresoProducto: 'asc' },
  },
  deudaOriginada: {
    include: {
      cliente: { include: { tipoDocumento: true } },
      egreso: true,
    },
  },
  abonoDeuda: true,
} as const;

export const egresoInclude = {
  caja: true,
  sucursal: true,
  motivoEgreso: true,
  usuario: { select: usuarioSelect },
  pagos: { include: { medioPago: true }, orderBy: { idMedioPago: 'asc' } },
  compra: true,
  percepciones: true,
  deudaCliente: true,
} as const;

export const compraInclude = {
  proveedor: { include: { tipoDocumento: true } },
  sucursal: true,
  almacen: true,
  usuario: { select: usuarioSelect },
  detalles: {
    include: {
      productoSucursal: {
        include: { producto: { include: { unidadMedida: true } } },
      },
    },
    orderBy: { idCompraDetalle: 'asc' },
  },
  comprobante: { include: { tipoComprobante: true } },
  egresos: {
    include: {
      motivoEgreso: true,
      pagos: { include: { medioPago: true } },
      percepciones: true,
    },
    orderBy: { idEgreso: 'asc' },
  },
  percepciones: { include: { egreso: { include: { pagos: true } } } },
} as const;

export const deudaInclude = {
  cliente: { include: { tipoDocumento: true } },
  ingresoOrigen: { include: ingresoInclude },
  egreso: { include: egresoInclude },
  abonos: {
    include: { ingresoAbono: { include: ingresoInclude } },
    orderBy: { idIngresoAbono: 'asc' },
  },
} as const;
