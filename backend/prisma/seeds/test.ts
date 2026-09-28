import { prisma } from './cliente-prisma.js';
import { seedLogistica } from './base/logistica.seed.js';
import { seedUnidadesMedida } from './base/unidades-medida.seed.js';
import { LogisticaService } from '../../src/modules/logistica/logistica.service.js';
import type { PrismaService } from '../../src/database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../src/common/types/usuario-autenticado.js';

// Datos de demostración. Este archivo se ejecuta por separado del seed normal.
// Los nombres reservados permiten repetirlo sin duplicar productos ni movimientos.
const PREFIJO = 'DEMO LOG - ';
const ALMACEN_PRINCIPAL = `${PREFIJO}Mostrador`;
const ALMACEN_SECUNDARIO = `${PREFIJO}Depósito`;

const ejemplos = [
  {
    nombre: 'Arroz a granel',
    detalle: 'Venta por kilogramo',
    categoria: 'Abarrotes',
    unidad: 'KG',
    codigoBarras: null,
    precioCompra: '3.20',
    precioVenta: '4.50',
    stockMinimo: '8.000',
    stockInicial: '25.000',
    movimientos: [
      { tipo: 2, cantidad: '5.000', observacion: 'DEMO LOG: ingreso de arroz' },
    ],
  },
  {
    nombre: 'Azúcar bolsa 1 kg',
    detalle: 'Una bolsa se contabiliza como una unidad',
    categoria: 'Abarrotes',
    unidad: 'UND',
    codigoBarras: '2000000000008',
    precioCompra: '3.60',
    precioVenta: '4.60',
    stockMinimo: '5.000',
    stockInicial: '12.000',
    movimientos: [
      {
        tipo: 3,
        cantidad: '2.000',
        observacion: 'DEMO LOG: ajuste por conteo de azúcar',
      },
    ],
  },
  {
    nombre: 'Pollo fresco',
    detalle: 'Venta por peso',
    categoria: 'Frescos',
    unidad: 'KG',
    codigoBarras: null,
    precioCompra: '10.00',
    precioVenta: '13.90',
    stockMinimo: '2.000',
    stockInicial: '8.500',
    movimientos: [
      { tipo: 4, cantidad: '0.500', observacion: 'DEMO LOG: merma de pollo' },
    ],
  },
  {
    nombre: 'Pan francés',
    detalle: 'Venta por unidad',
    categoria: 'Panadería',
    unidad: 'UND',
    codigoBarras: null,
    precioCompra: '0.25',
    precioVenta: '0.40',
    stockMinimo: '10.000',
    stockInicial: '6.000',
    movimientos: [
      { tipo: 4, cantidad: '2.000', observacion: 'DEMO LOG: merma de pan' },
    ],
  },
  {
    nombre: 'Clavos a granel',
    detalle: 'Ejemplo para una ferretería',
    categoria: 'Ferretería',
    unidad: 'KG',
    codigoBarras: null,
    precioCompra: '4.00',
    precioVenta: '6.00',
    stockMinimo: '3.000',
    stockInicial: '0.000',
    movimientos: [],
  },
] as const;

async function obtenerAdminYSucursal() {
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
  if (!correo)
    throw new Error(
      'Configura ADMIN_CORREO y ejecuta primero npx prisma db seed',
    );

  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: {
      rol: true,
      estado: true,
      sucursales: {
        include: { sucursal: true },
        orderBy: { idSucursal: 'asc' },
      },
    },
  });
  if (
    !usuario ||
    usuario.rol.nombre !== 'ADMIN' ||
    usuario.estado.nombre !== 'ACTIVO'
  ) {
    throw new Error('Se necesita el usuario ADMIN activo del seed normal');
  }
  const sucursal =
    usuario.sucursales
      .map(({ sucursal }) => sucursal)
      .find((item) => item.activo && item.nombre === 'Sucursal Principal') ??
    usuario.sucursales
      .map(({ sucursal }) => sucursal)
      .find((item) => item.activo);
  if (!sucursal)
    throw new Error('El ADMIN necesita una sucursal activa asignada');

  const actor: UsuarioAutenticado = {
    idUsuario: usuario.idUsuario,
    correo: usuario.correo,
    estado: usuario.estado.nombre,
    rol: { idRol: usuario.idRol, nombre: usuario.rol.nombre },
    permisos: [],
    sucursales: [sucursal.idSucursal],
  };
  return { actor, sucursal };
}

async function asegurarProducto(
  datos: (typeof ejemplos)[number],
  idTipoProducto: number,
  idCategoria: number,
  idUnidadMedida: number,
) {
  const nombre = `${PREFIJO}${datos.nombre}`;
  const existente = await prisma.producto.findFirst({
    where: { nombre },
    orderBy: { idProducto: 'asc' },
  });
  if (existente) return existente;
  return prisma.producto.create({
    data: {
      nombre,
      detalle: datos.detalle,
      codigoBarras: datos.codigoBarras,
      idTipoProducto,
      idCategoria,
      idUnidadMedida,
    },
  });
}

async function asegurarInventario(
  servicio: LogisticaService,
  actor: UsuarioAutenticado,
  idProductoSucursal: number,
  idAlmacen: number,
  stockMinimo: string,
  stockInicial: string,
) {
  const existente = await prisma.inventario.findUnique({
    where: { idProductoSucursal_idAlmacen: { idProductoSucursal, idAlmacen } },
  });
  if (existente) return existente.idInventario;
  const creado = await servicio.crearInventario(
    { idProductoSucursal, idAlmacen, stockMinimo, stockInicial },
    actor,
  );
  return creado.idInventario;
}

async function main() {
  await seedLogistica();
  await seedUnidadesMedida();
  const { actor, sucursal } = await obtenerAdminYSucursal();
  const servicio = new LogisticaService(prisma as unknown as PrismaService);

  const tipo = await prisma.tipoProducto.upsert({
    where: { nombre: `${PREFIJO}Mercadería` },
    create: { nombre: `${PREFIJO}Mercadería` },
    update: {},
  });
  const categorias = new Map<string, number>();
  for (const [nombre, color] of [
    ['Abarrotes', '#C79136'],
    ['Frescos', '#D46B62'],
    ['Panadería', '#B98055'],
    ['Ferretería', '#667E9B'],
  ]) {
    const categoria = await prisma.categoria.upsert({
      where: { nombre: `${PREFIJO}${nombre}` },
      create: { nombre: `${PREFIJO}${nombre}`, color },
      update: {},
    });
    categorias.set(nombre, categoria.idCategoria);
  }

  const almacenes = [];
  for (const nombre of [ALMACEN_PRINCIPAL, ALMACEN_SECUNDARIO]) {
    almacenes.push(
      await prisma.almacen.upsert({
        where: {
          idSucursal_nombre: { idSucursal: sucursal.idSucursal, nombre },
        },
        create: { idSucursal: sucursal.idSucursal, nombre },
        update: {},
      }),
    );
  }

  for (const ejemplo of ejemplos) {
    const unidad = await prisma.unidadMedida.findUniqueOrThrow({
      where: { simbolo: ejemplo.unidad },
    });
    const idCategoria = categorias.get(ejemplo.categoria);
    if (!idCategoria)
      throw new Error(`Falta la categoría ${ejemplo.categoria}`);
    const producto = await asegurarProducto(
      ejemplo,
      tipo.idTipoProducto,
      idCategoria,
      unidad.idUnidadMedida,
    );
    const asignacion = await prisma.productoSucursal.upsert({
      where: {
        idProducto_idSucursal: {
          idProducto: producto.idProducto,
          idSucursal: sucursal.idSucursal,
        },
      },
      create: {
        idProducto: producto.idProducto,
        idSucursal: sucursal.idSucursal,
        precioCompra: ejemplo.precioCompra,
        precioVenta: ejemplo.precioVenta,
      },
      update: {},
    });
    const idInventario = await asegurarInventario(
      servicio,
      actor,
      asignacion.idProductoSucursal,
      almacenes[0].idAlmacen,
      ejemplo.stockMinimo,
      ejemplo.stockInicial,
    );
    for (const movimiento of ejemplo.movimientos) {
      const existe = await prisma.inventarioMovimiento.findFirst({
        where: { idInventario, observacion: movimiento.observacion },
      });
      if (!existe) {
        await servicio.crearMovimiento(
          {
            idInventario,
            idTipoMovimiento: movimiento.tipo,
            cantidad: movimiento.cantidad,
            observacion: movimiento.observacion,
          },
          actor,
        );
      }
    }
    if (ejemplo.nombre === 'Arroz a granel') {
      await asegurarInventario(
        servicio,
        actor,
        asignacion.idProductoSucursal,
        almacenes[1].idAlmacen,
        '5.000',
        '10.000',
      );
    }
  }

  const inactivo = `${PREFIJO}Producto descontinuado`;
  if (!(await prisma.producto.findFirst({ where: { nombre: inactivo } }))) {
    const unidad = await prisma.unidadMedida.findUniqueOrThrow({
      where: { simbolo: 'UND' },
    });
    await prisma.producto.create({
      data: {
        nombre: inactivo,
        idTipoProducto: tipo.idTipoProducto,
        idCategoria: categorias.get('Abarrotes')!,
        idUnidadMedida: unidad.idUnidadMedida,
        estado: false,
      },
    });
  }

  console.log(
    `Datos de logística preparados en ${sucursal.nombre} (ID ${sucursal.idSucursal}).`,
  );
  console.log(
    'Incluye 6 productos, 2 almacenes, stock inicial, ajustes y mermas.',
  );
  console.log(
    'Puedes ingresar con el ADMIN del seed normal, si tiene LOGISTICA_VER y LOGISTICA_GESTIONAR.',
  );
}

main()
  .catch((error) => {
    console.error('Error al cargar datos de prueba de logística:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
