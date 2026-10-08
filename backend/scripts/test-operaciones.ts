import 'dotenv/config';
import { OperacionesService } from '../src/modules/operaciones/operaciones.service.js';
import type { PrismaService } from '../src/database/prisma/prisma.service.js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import mariadb from 'mariadb';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

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
  const service = new OperacionesService(prisma as unknown as PrismaService);
  const { caja } = await service.abrirCaja(
    { idSucursal: sucursal.idSucursal, montoApertura: '200.00' },
    actor,
  );
  const arroz = await prisma.inventario.findFirstOrThrow({
    where: {
      almacen: { tipo: 'AREA_VENTA' },
      productoSucursal: { producto: { nombre: 'DEMO LOG - Arroz a granel' } },
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
    service.crearVenta(venta, actor),
    service.crearVenta(venta, actor),
  ]);
  assert.equal(replies[0].venta.idIngreso, replies[1].venta.idIngreso);
  assert.equal(
    await prisma.ingreso.count({
      where: { claveOperacion: venta.claveOperacion },
    }),
    1,
  );
  await assert.rejects(
    service.crearVenta({ ...venta, detalle: 'Modificado' }, actor),
    /otros datos/,
  );
  const credito = await service.crearVenta(
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
  await service.crearIngreso(
    { ...context, idMotivoIngreso: 3, monto: '20.00', pagos: pago('20.00') },
    actor,
  );
  await service.crearEgreso(
    { ...context, idMotivoEgreso: 4, monto: '5.00', pagos: pago('5.00') },
    actor,
  );
  const compra = await service.crearCompra(
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
  await service.registrarPagoCompra(
    compra.compra.idCompra,
    { ...context, pagos: pago('10.00') },
    actor,
  );
  await service.registrarPercepcionCompra(
    compra.compra.idCompra,
    {
      ...context,
      fechaPercepcion: '2026-10-03',
      baseCalculo: '15.00',
      porcentaje: '2.000',
      monto: '0.30',
      pagos: pago('0.30'),
    },
    actor,
  );
  await service.crearAbonoDeuda(
    credito.venta.deudaOriginada!.idDeudaCliente,
    { ...context, monto: '3.00', pagos: pago('3.00') },
    actor,
  );
  const resumen = (await service.obtenerResumenCaja(caja.idCaja, actor))
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
    '32',
  );
  assert.equal(
    (await service.listarVentas({ ...context, pagina: 1, limite: 100 }, actor))
      .total,
    2,
  );
  assert.equal(
    (await service.listarCompras({ ...context, pagina: 1, limite: 100 }, actor))
      .total,
    1,
  );
  const ingresosAntes = await prisma.ingreso.count();
  await assert.rejects(
    service.crearVenta(
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
    (await service.obtenerResumenCaja(caja.idCaja, actor)).resumen
      .saldoRegistrado,
    '213.20',
  );
  await assert.rejects(
    service.obtenerResumenCaja(caja.idCaja, { ...actor, sucursales: [] }),
    /sucursal/i,
  );
  for (let i = 0; i < 101; i++)
    await service.crearIngreso(
      { ...context, idMotivoIngreso: 3, monto: '0.01', pagos: pago('0.01') },
      actor,
    );
  const completo = (await service.obtenerResumenCaja(caja.idCaja, actor))
    .resumen;
  assert.equal(completo.saldoCalculado, '214.21');
  assert.equal(completo.cantidades.ingresos, 103);
  await service.cerrarCaja(caja.idCaja, { montoCierre: '214.21' }, actor);
  const retry = await service.crearVenta(venta, actor);
  assert.equal(retry.venta.idIngreso, replies[0].venta.idIngreso);
  const segunda = await service.abrirCaja(
    { idSucursal: sucursal.idSucursal, montoApertura: '50.00' },
    actor,
  );
  assert.equal(
    (await service.obtenerResumenCaja(segunda.caja.idCaja, actor)).resumen
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
