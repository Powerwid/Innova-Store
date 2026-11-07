import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import mariadb from 'mariadb';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { productosTest } from '../prisma/seeds/test/productos.seed.js';

// Prueba el comando completo dos veces en una base desechable.
const source = new URL(process.env.DATABASE_URL || '');
const database = `innova_seed_test_${randomUUID().replaceAll('-', '')}`;
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
  assert.match(database, /^innova_seed_test_[a-f0-9]{32}$/);
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
  await prisma.usuario.create({
    data: {
      correo: env.ADMIN_CORREO,
      contrasena: 'unused-test-account',
      idRol: rol.idRol,
      idEstado: estado.idEstado,
      sucursales: { create: { idSucursal: sucursal.idSucursal } },
    },
  });
  await run(['--import', 'tsx', 'prisma/seeds/test.ts']);
  assert.equal(await prisma.producto.count(), productosTest.length);
  assert.equal(await prisma.categoria.count(), 15);
  assert.equal(await prisma.tipoProducto.count(), 6);
  const almacen = await prisma.almacen.findFirstOrThrow({
    where: { tipo: 'AREA_VENTA' },
  });
  const arroz = await prisma.inventario.findFirstOrThrow({
    where: {
      idAlmacen: almacen.idAlmacen,
      productoSucursal: { producto: { nombre: 'Arroz a granel' } },
    },
  });
  assert.equal(arroz.stock.toString(), '85');
  const tomate = await prisma.inventario.findFirstOrThrow({
    where: {
      idAlmacen: almacen.idAlmacen,
      productoSucursal: { producto: { nombre: 'Tomate italiano' } },
    },
  });
  assert.equal(tomate.stock.toString(), '60');
  const inventariosVenta = await prisma.inventario.findMany({
    where: {
      idAlmacen: almacen.idAlmacen,
      productoSucursal: {
        estado: true,
        precioVenta: { gt: 0 },
        producto: { estado: true },
      },
    },
  });
  const conStockAmplio = inventariosVenta.filter((item) => item.stock.gt(40));
  assert.ok(inventariosVenta.length > 0);
  assert.ok(
    conStockAmplio.length / inventariosVenta.length >= 0.9,
    'Al menos el 90% del catálogo vendible debe superar 40 en su unidad de venta.',
  );
  assert.equal(
    inventariosVenta.filter((item) => item.stock.isZero()).length,
    2,
  );
  assert.equal(
    inventariosVenta.filter(
      (item) => item.stock.gt(0) && item.stock.lt(item.stockMinimo),
    ).length,
    2,
  );
  const [productos, categorias, tipos, almacenes] = await Promise.all([
    prisma.producto.findMany({ select: { nombre: true, detalle: true } }),
    prisma.categoria.findMany({ select: { nombre: true } }),
    prisma.tipoProducto.findMany({ select: { nombre: true } }),
    prisma.almacen.findMany({ select: { nombre: true } }),
  ]);
  for (const item of [...productos, ...categorias, ...tipos, ...almacenes]) {
    assert.doesNotMatch(item.nombre, /\b(demo|test|prueba)\b/i);
  }
  for (const item of productos) {
    assert.doesNotMatch(item.detalle ?? '', /\b(demo|test|prueba)\b/i);
  }
  // Repetir el seed conserva un precio editado, estados y todos los saldos.
  await prisma.productoSucursal.update({
    where: { idProductoSucursal: arroz.idProductoSucursal },
    data: { precioVenta: '9.99' },
  });
  const before = {
    products: await prisma.producto.count(),
    assignments: await prisma.productoSucursal.count(),
    movements: await prisma.inventarioMovimiento.count(),
    inventory: JSON.stringify(
      await prisma.inventario.findMany({ orderBy: { idInventario: 'asc' } }),
    ),
  };
  await run(['--import', 'tsx', 'prisma/seeds/test.ts']);
  assert.equal(await prisma.producto.count(), before.products);
  assert.equal(await prisma.productoSucursal.count(), before.assignments);
  assert.equal(await prisma.inventarioMovimiento.count(), before.movements);
  assert.equal(
    JSON.stringify(
      await prisma.inventario.findMany({ orderBy: { idInventario: 'asc' } }),
    ),
    before.inventory,
  );
  assert.equal(
    (
      await prisma.productoSucursal.findUniqueOrThrow({
        where: { idProductoSucursal: arroz.idProductoSucursal },
      })
    ).precioVenta.toString(),
    '9.99',
  );
  console.log(
    `Seed verificado en MySQL: ${before.products} productos con nombres comerciales, ${conStockAmplio.length}/${inventariosVenta.length} productos vendibles con stock mayor a 40, relaciones, movimientos y repetición sin duplicados ni cambios de stock.`,
  );
} finally {
  await prisma?.$disconnect();
  if (created) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
