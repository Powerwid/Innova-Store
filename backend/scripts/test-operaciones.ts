import 'dotenv/config';
import { crearServiciosOperaciones } from '../test/helpers/operaciones.js';
import type { PrismaService } from '../src/database/prisma/prisma.service.js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import mariadb from 'mariadb';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

// Prueba el comando completo dos veces en una base desechable.
const source = new URL(process.env.DATABASE_URL || '');
const database = `innova_operaciones_test_${randomUUID().replaceAll('-', '')}`;
const connection = {
  host: source.hostname,
  port: Number(source.port || 3306),
  user: decodeURIComponent(source.username),
  password: decodeURIComponent(source.password),
  allowPublicKeyRetrieval:
    process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL !== 'false',
};
const admin = await mariadb.createConnection(connection);
const testUrl = new URL(source);
testUrl.pathname = '/' + database;
const env = {
  ...process.env,
  DATABASE_URL: testUrl.href,
  ADMIN_CORREO: 'seed-test@example.test',
};
let prisma: PrismaClient | undefined;
let created = false;
async function run(args: string[]) {
  const child = spawn(process.execPath, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('exit', resolve);
    child.on('error', reject);
  });
  assert.equal(code, 0, output);
}
try {
  assert.match(database, /^innova_operaciones_test_[a-f0-9]{32}$/);
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  created = true;
  await run([
    'node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--config',
    'prisma7.config.ts',
  ]);
  prisma = new PrismaClient({
    adapter: new PrismaMariaDb({ ...connection, database }),
  });
  const rol = await prisma.rol.upsert({
    where: { nombre: 'ADMIN' },
    create: { nombre: 'ADMIN' },
    update: {},
  });
  const estado = await prisma.estado.upsert({
    where: { nombre: 'ACTIVO' },
    create: { nombre: 'ACTIVO' },
    update: {},
  });
  const sucursal = await prisma.sucursal.create({
    data: { nombre: 'Sucursal Principal' },
  });
  const usuario = await prisma.usuario.create({
    data: {
      correo: env.ADMIN_CORREO,
      contrasena: 'unused-test-account',
      idRol: rol.idRol,
      idEstado: estado.idEstado,
      sucursales: { create: { idSucursal: sucursal.idSucursal } },
    },
  });
  await run(['--import', 'tsx', 'prisma/seeds/test.ts']);
  await run(['--import', 'tsx', 'prisma/seeds/motivos.ts']);
  const efectivo = await prisma.medioPago.create({
    data: { nombre: 'Efectivo' },
  });
  const documento = await prisma.tipoDocumento.create({
    data: { nombre: 'DNI' },
  });
  const cliente = await prisma.cliente.create({
    data: {
      nombre: 'Cliente de prueba',
      idTipoDocumento: documento.idTipoDocumento,
      numeroDocumento: '12345678',
    },
  });
  const actor = {
    idUsuario: usuario.idUsuario,
    correo: usuario.correo,
    estado: 'ACTIVO',
    rol: { idRol: rol.idRol, nombre: 'ADMIN' },
    permisos: [],
    sucursales: [sucursal.idSucursal],
  };
  const servicios = crearServiciosOperaciones(prisma as unknown as PrismaService);
  const { caja } = await servicios.cajas.abrirCaja(
    { idSucursal: sucursal.idSucursal, montoApertura: '200.00' },
    actor,
  );
  const arroz = await prisma.inventario.findFirstOrThrow({
    where: {
      almacen: { tipo: 'AREA_VENTA' },
      productoSucursal: { producto: { nombre: 'Arroz a granel' } },
    },
  });
  const context = { idCaja: caja.idCaja, idSucursal: sucursal.idSucursal };
  const pago = (monto: string) => [
    { idMedioPago: efectivo.idMedioPago, monto },
  ];
  const line = (cantidad: string, precioUnitario: string) => ({
    idProductoSucursal: arroz.idProductoSucursal,
    idAlmacen: arroz.idAlmacen,
    cantidad,
    precioUnitario,
  });
  const venta = {
    ...context,
    claveOperacion: randomUUID(),
    monto: '9.00',
    productos: [line('2.000', '4.5000')],
    pagos: pago('9.00'),
  };
  const replies = await Promise.all([
    servicios.ventas.crearVenta(venta, actor),
    servicios.ventas.crearVenta(venta, actor),
  ]);
  assert.equal(replies[0].venta.idIngreso, replies[1].venta.idIngreso);
  assert.equal(
    await prisma.ingreso.count({
      where: { claveOperacion: venta.claveOperacion },
    }),
    1,
  );
  await assert.rejects(
    servicios.ventas.crearVenta({ ...venta, detalle: 'Modificado' }, actor),
    /otros datos/,
  );
  const credito = await servicios.ventas.crearVenta(
    {
      ...context,
      claveOperacion: randomUUID(),
      monto: '4.50',
      productos: [line('1.000', '4.5000')],
      pagos: pago('1.50'),
      credito: { idCliente: cliente.idCliente },
    },
    actor,
  );
  assert.ok(credito.venta.deudaOriginada);
  await servicios.movimientos.crearIngreso(
    { ...context, idMotivoIngreso: 3, monto: '20.00', pagos: pago('20.00') },
    actor,
  );
  await servicios.movimientos.crearEgreso(
    { ...context, idMotivoEgreso: 4, monto: '5.00', pagos: pago('5.00') },
    actor,
  );
  const compra = await servicios.compras.crearCompra(
    {
      ...context,
      idAlmacen: arroz.idAlmacen,
      nombreProveedor: 'Proveedor de prueba',
      total: '15.00',
      detalles: [
        {
          idProductoSucursal: arroz.idProductoSucursal,
          cantidad: '5.000',
          precioUnitario: '3.0000',
        },
      ],
      pagos: pago('5.00'),
    },
    actor,
  );
  await servicios.compras.registrarPagoCompra(
    compra.compra.idCompra,
    { ...context, pagos: pago('10.00') },
    actor,
  );
  await servicios.compras.registrarPercepcionCompra(
    compra.compra.idCompra,
    {
      ...context,
      fechaPercepcion: '2026-10-03',
      baseCalculo: '7.50',
      porcentaje: '2.000',
      monto: '0.15',
      numeroConstancia: 'P-PRUEBA-1',
      pagos: pago('0.15'),
    },
    actor,
  );
  const parcial = {
    ...context, fechaPercepcion: '2026-10-03', baseCalculo: '7.50',
    porcentaje: '2.000', monto: '0.15', pagos: pago('0.15'),
  };
  // Repetir un documento no debe crear un egreso ni consumir saldo de caja.
  await assert.rejects(
    servicios.compras.registrarPercepcionCompra(compra.compra.idCompra,
      { ...parcial, numeroConstancia: ' p-prueba-1 ' }, actor),
    /comprobante de percepción ya está registrado/,
  );
  // Solo una de las dos solicitudes puede utilizar la base restante.
  const percepcionesConcurrentes = await Promise.allSettled([
    servicios.compras.registrarPercepcionCompra(compra.compra.idCompra, parcial, actor),
    servicios.compras.registrarPercepcionCompra(compra.compra.idCompra, parcial, actor),
  ]);
  assert.equal(percepcionesConcurrentes.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(percepcionesConcurrentes.filter((r) => r.status === 'rejected').length, 1);
  await assert.rejects(
    servicios.compras.registrarPercepcionCompra(compra.compra.idCompra, parcial, actor),
    /percepción sobre todo su importe/,
  );
  const percepcionesCompra = await prisma.compraPercepcion.findMany({
    where: { idCompra: compra.compra.idCompra },
  });
  assert.equal(percepcionesCompra.length, 2);
  assert.equal(percepcionesCompra.reduce((sum, p) => sum.plus(p.baseCalculo),
    new Prisma.Decimal(0)).toFixed(2), '15.00');
  assert.equal(percepcionesCompra.reduce((sum, p) => sum.plus(p.monto),
    new Prisma.Decimal(0)).toFixed(2), '0.30');
  await servicios.cobros.crearAbonoDeuda(
    credito.venta.deudaOriginada!.idDeudaCliente,
    { ...context, monto: '3.00', pagos: pago('3.00') },
    actor,
  );
  const resumen = (await servicios.cajas.obtenerResumenCaja(caja.idCaja, actor))
    .resumen;
  assert.equal(resumen.saldoCalculado, '213.20');
  assert.equal(resumen.saldoRegistrado, '213.20');
  assert.equal(resumen.diferencia, '0.00');
  assert.equal(resumen.cobrosVentas, '10.50');
  assert.equal(resumen.ingresos, '23.00');
  assert.equal(resumen.compras, '15.30');
  assert.equal(
    (
      await prisma.inventario.findUniqueOrThrow({
        where: { idInventario: arroz.idInventario },
      })
    ).stock.toString(),
    arroz.stock.plus(2).toString(),
  );
  assert.equal(
    (await servicios.ventas.listarVentas({ ...context, pagina: 1, limite: 100 }, actor))
      .total,
    2,
  );
  assert.equal(
    (await servicios.compras.listarCompras({ ...context, pagina: 1, limite: 100 }, actor))
      .total,
    1,
  );
  const ingresosAntes = await prisma.ingreso.count();
  await assert.rejects(
    servicios.ventas.crearVenta(
      {
        ...context,
        claveOperacion: randomUUID(),
        monto: '450.00',
        productos: [line('100.000', '4.5000')],
        pagos: pago('450.00'),
      },
      actor,
    ),
    /stock/i,
  );
  assert.equal(await prisma.ingreso.count(), ingresosAntes);
  assert.equal(
    (await servicios.cajas.obtenerResumenCaja(caja.idCaja, actor)).resumen
      .saldoRegistrado,
    '213.20',
  );
  await assert.rejects(
    servicios.cajas.obtenerResumenCaja(caja.idCaja, { ...actor, sucursales: [] }),
    /sucursal/i,
  );
  for (let i = 0; i < 101; i++)
    await servicios.movimientos.crearIngreso(
      { ...context, idMotivoIngreso: 3, monto: '0.01', pagos: pago('0.01') },
      actor,
    );
  const completo = (await servicios.cajas.obtenerResumenCaja(caja.idCaja, actor))
    .resumen;
  assert.equal(completo.saldoCalculado, '214.21');
  assert.equal(completo.cantidades.ingresos, 103);
  // Regresión: pago inicial completo con los importes de la captura del usuario.
  const otrosProductos = await prisma.productoSucursal.findMany({
    where: { idSucursal: sucursal.idSucursal, idProductoSucursal: { not: arroz.idProductoSucursal } },
    take: 2,
  });
  assert.equal(otrosProductos.length, 2);
  const compraCompleta = await servicios.compras.crearCompra({
    ...context, idAlmacen: arroz.idAlmacen, nombreProveedor: 'Prueba de pago completo',
    total: '161.50', pagos: pago('161.50'), detalles: [
      { idProductoSucursal: arroz.idProductoSucursal, cantidad: '37.000', precioUnitario: '3.0000' },
      { idProductoSucursal: otrosProductos[0]!.idProductoSucursal, cantidad: '13.000', precioUnitario: '1.5000' },
      { idProductoSucursal: otrosProductos[1]!.idProductoSucursal, cantidad: '31.000', precioUnitario: '1.0000' },
    ],
  }, actor);
  assert.equal(compraCompleta.compra.total.toFixed(2), '161.50');
  assert.equal(compraCompleta.compra.montoPagado, '161.50');
  assert.equal(compraCompleta.compra.saldoPendiente, '0.00');
  assert.equal((await servicios.cajas.obtenerResumenCaja(caja.idCaja, actor)).resumen.saldoCalculado, '52.71');
  const pendiente = {
    ...context, idAlmacen: arroz.idAlmacen, nombreProveedor: 'Prueba de saldo insuficiente',
    total: '203.50', pagos: [], detalles: [{ idProductoSucursal: arroz.idProductoSucursal, cantidad: '203.500', precioUnitario: '1.0000' }],
  };
  const comprasAntes = await prisma.compra.count();
  await assert.rejects(servicios.compras.crearCompra({ ...pendiente, pagos: pago('203.50') }, actor),
    /Saldo insuficiente en Efectivo\. Disponible en caja: S\/ 52\.71\. Pago solicitado: S\/ 203\.50/);
  assert.equal(await prisma.compra.count(), comprasAntes);
  const compraPendiente = await servicios.compras.crearCompra(pendiente, actor);
  const egresosAntes = await prisma.egreso.count();
  await assert.rejects(servicios.compras.registrarPagoCompra(compraPendiente.compra.idCompra,
    { ...context, pagos: pago('203.50') }, actor), /Disponible en caja: S\/ 52\.71/);
  assert.equal(await prisma.egreso.count(), egresosAntes);
  assert.equal((await servicios.compras.obtenerCompra(compraPendiente.compra.idCompra, actor)).saldoPendiente, '203.50');
  // Un ingreso real registrado en la caja permite efectuar el pago completo.
  await servicios.movimientos.crearIngreso({ ...context, idMotivoIngreso: 3, monto: '200.00', pagos: pago('200.00') }, actor);
  const pagada = await servicios.compras.registrarPagoCompra(compraPendiente.compra.idCompra,
    { ...context, pagos: pago('203.50') }, actor);
  assert.equal(pagada.compra.saldoPendiente, '0.00');
  assert.equal((await servicios.cajas.obtenerResumenCaja(caja.idCaja, actor)).resumen.saldoCalculado, '49.21');
  await servicios.cajas.cerrarCaja(caja.idCaja, { montoCierre: '49.21' }, actor);
  const retry = await servicios.ventas.crearVenta(venta, actor);
  assert.equal(retry.venta.idIngreso, replies[0].venta.idIngreso);
  const segunda = await servicios.cajas.abrirCaja(
    { idSucursal: sucursal.idSucursal, montoApertura: '50.00' },
    actor,
  );
  assert.equal(
    (await servicios.cajas.obtenerResumenCaja(segunda.caja.idCaja, actor)).resumen
      .saldoCalculado,
    '50.00',
  );
  console.log(
    'MySQL: venta concurrente sin duplicados, crédito/abono, ingreso/egreso, compra/pago/percepción, stock, rollback, sucursales, resumen de más de 100 movimientos y cierre verificados.',
  );
} finally {
  await prisma?.$disconnect();
  if (created) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
