import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { JwtService } from '@nestjs/jwt';
import mariadb from 'mariadb';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { io, type Socket } from 'socket.io-client';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import { PermisoSistema } from '../src/common/enums/permiso-sistema.enum.js';
import { verificarReportes } from './test-reportes-checks.js';

const source = new URL(process.env.DATABASE_URL || '');
const database = `innova_realtime_test_${randomUUID().replaceAll('-', '')}`;
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
  ADMIN_CORREO: 'socket-test@example.test',
  OBSERVE_APP_KEY: '',
  OBSERVE_APP_SECRET: '',
  RECOGNITION_SERVICE_URL: '',
};
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
let created = false,
  prisma: PrismaClient | undefined,
  server: ChildProcess | undefined;
const clients: Socket[] = [];
let serverLog = '';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function run(args: string[], extra = {}) {
  const child = spawn(process.execPath, args, {
    env: { ...env, ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const code = await new Promise((resolve, reject) => {
    child.once('exit', resolve);
    child.once('error', reject);
  });
  assert.equal(code, 0, output);
  if (extra && 'UI_BASE_URL' in extra) process.stdout.write(output);
}
async function freePort() {
  const net = createServer();
  await new Promise<void>((resolve) => net.listen(0, '127.0.0.1', resolve));
  const port = (net.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    net.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}
try {
  assert.match(database, /^innova_realtime_test_[a-f0-9]{32}$/);
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
  const rol = await prisma.rol.create({ data: { nombre: 'SUPERADMIN' } });
  const seedRole = await prisma.rol.create({ data: { nombre: 'ADMIN' } });
  const estado = await prisma.estado.create({ data: { nombre: 'ACTIVO' } });
  const branch = await prisma.sucursal.create({
    data: { nombre: 'Sucursal Principal' },
  });
  await prisma.sucursalPerfil.create({
    data: { idSucursal: branch.idSucursal, igv: '18.00' },
  });
  const second = await prisma.sucursal.create({
    data: { nombre: 'Sucursal Norte' },
  });
  const user = await prisma.usuario.create({
    data: {
      correo: env.ADMIN_CORREO,
      contrasena: 'unused-test-account',
      idRol: seedRole.idRol,
      idEstado: estado.idEstado,
      sucursales: { create: { idSucursal: branch.idSucursal } },
    },
  });
  await run(['--import', 'tsx', 'prisma/seeds/test.ts']);
  await run(['--import', 'tsx', 'prisma/seeds/motivos.ts']);
  await prisma.usuario.update({
    where: { idUsuario: user.idUsuario },
    data: { idRol: rol.idRol },
  });
  const cash = await prisma.medioPago.create({ data: { nombre: 'Efectivo' } });
  await prisma.medioPago.create({ data: { nombre: 'Yape' } });
  const document = await prisma.tipoDocumento.create({
    data: { nombre: 'DNI' },
  });
  const person = await prisma.cliente.create({
    data: {
      nombre: 'Ana Prueba',
      idTipoDocumento: document.idTipoDocumento,
      numeroDocumento: '12345678',
    },
  });
  const anonymous = await prisma.cliente.findFirstOrThrow({
    where: { esGenerico: true },
  });
  const port = await freePort(),
    base = `http://127.0.0.1:${port}`;
  const cookie =
    'access_token=' +
    (await jwt.signAsync(
      { sub: user.idUsuario, tipo: 'access' },
      { expiresIn: '1h' },
    ));
  server = spawn(process.execPath, ['dist/main.js'], {
    env: { ...env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (chunk) => {
    serverLog += chunk;
  });
  server.stderr?.on('data', (chunk) => {
    serverLog += chunk;
  });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error('El servidor de prueba no inició: ' + serverLog);
    const ready = await fetch(base + '/api/auth/me', {
      headers: { cookie },
    }).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) break;
    if (i === 99)
      throw new Error('El servidor de prueba no respondió: ' + serverLog);
    await delay(150);
  }
  async function request(path: string, body: unknown, method = 'POST') {
    const response = await fetch(base + '/api/' + path, {
      method,
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    return { status: response.status, result };
  }
  function socket(branchId: number, session = cookie, transport = 'websocket') {
    const client = io(base + '/tiempo-real', {
      transports: [transport as 'websocket'],
      auth: { idSucursal: branchId },
      extraHeaders: { Cookie: session },
      reconnection: false,
    });
    clients.push(client);
    return client;
  }
  async function connected(client: Socket) {
    if (client.connected) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timeout de conexión')),
        5000,
      );
      client.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      client.once('connect_error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
  async function rejected(client: Socket) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Aceptó o no rechazó una conexión inválida')),
        5000,
      );
      client.once('connect_error', () => {
        clearTimeout(timer);
        resolve();
      });
      client.once('connect', () => {
        clearTimeout(timer);
        reject(new Error('Conexión no autorizada aceptada'));
      });
    });
  }
  await rejected(socket(branch.idSucursal, ''));
  const viewerRole = await prisma.rol.create({ data: { nombre: 'VENDEDOR' } });
  const viewer = await prisma.usuario.create({
    data: {
      correo: 'viewer@example.test',
      contrasena: 'unused',
      idRol: viewerRole.idRol,
      idEstado: estado.idEstado,
      sucursales: { create: { idSucursal: branch.idSucursal } },
    },
  });
  const viewerCookie =
    'access_token=' +
    (await jwt.signAsync(
      { sub: viewer.idUsuario, tipo: 'access' },
      { expiresIn: '1h' },
    ));
  await rejected(socket(second.idSucursal, viewerCookie));
  const a = socket(branch.idSucursal),
    b = socket(branch.idSucursal),
    north = socket(second.idSucursal),
    noPermissions = socket(branch.idSucursal, viewerCookie, 'polling');
  await Promise.all([a, b, north, noPermissions].map(connected));
  const events: unknown[] = [],
    foreign: unknown[] = [],
    restricted: unknown[] = [];
  b.on('datos:actualizados', (change) => events.push(change));
  north.on('datos:actualizados', (change) => foreign.push(change));
  noPermissions.on('datos:actualizados', (change) => restricted.push(change));
  const opened = await request('cajas', {
    idSucursal: branch.idSucursal,
    montoApertura: '200.00',
  });
  assert.equal(opened.status, 201);
  const box = opened.result.caja;
  const rice = await prisma.inventario.findFirstOrThrow({
    where: {
      productoSucursal: { producto: { nombre: 'Arroz a granel' } },
      almacen: { tipo: 'AREA_VENTA' },
    },
  });
  const sale = {
    idSucursal: branch.idSucursal,
    idCaja: box.idCaja,
    idCliente: anonymous.idCliente,
    claveOperacion: randomUUID(),
    monto: '4.50',
    efectivoRecibido: '10.00',
    productos: [
      {
        idProductoSucursal: rice.idProductoSucursal,
        idAlmacen: rice.idAlmacen,
        cantidad: '1.000',
        precioUnitario: '4.5000',
      },
    ],
    pagos: [{ idMedioPago: cash.idMedioPago, monto: '4.50' }],
  };
  const confirmed = await request('ventas', sale);
  assert.equal(confirmed.status, 201);
  assert.equal((await request('ventas', sale)).status, 201);
  await delay(250);
  assert.ok(
    events.some(
      (value: any) =>
        value.recursos.includes('stock') &&
        value.idSucursal === branch.idSucursal,
    ),
  );
  assert.equal(foreign.length, 0);
  assert.equal(restricted.length, 0);
  assert.equal(
    await prisma.ingreso.count({
      where: { claveOperacion: sale.claveOperacion },
    }),
    1,
  );
  const count = events.length;
  assert.equal(
    (
      await request('ventas', {
        ...sale,
        claveOperacion: randomUUID(),
        monto: '450000.00',
        efectivoRecibido: '450000.00',
        productos: [{ ...sale.productos[0], cantidad: '100000.000' }],
        pagos: [{ idMedioPago: cash.idMedioPago, monto: '450000.00' }],
      })
    ).status,
    409,
  );
  await delay(200);
  assert.equal(events.length, count, 'Un rollback no emite eventos');
  assert.equal(
    (
      await request('ventas', {
        ...sale,
        claveOperacion: randomUUID(),
        pagos: [],
        credito: { idCliente: anonymous.idCliente },
      })
    ).status,
    400,
  );
  const pendingSale = await request('ventas', {
    ...sale,
    efectivoRecibido: undefined,
    claveOperacion: randomUUID(),
    idCliente: person.idCliente,
    pagos: [],
    credito: { idCliente: person.idCliente },
  });
  assert.equal(pendingSale.status, 201);

  // Un ticket es una lectura de la venta confirmada, nunca una segunda venta.
  const ticketId = confirmed.result.venta.idIngreso;
  const savedTicket = confirmed.result.venta.ticketDatos;
  assert.equal(savedTicket.vuelto, '5.50');
  assert.equal(savedTicket.subtotal, '3.81');
  assert.equal(savedTicket.igv, '0.69');
  const beforeTickets = await prisma.ingreso.count();
  const beforeStock = await prisma.inventario.findUniqueOrThrow({
    where: { idInventario: rice.idInventario },
  });
  async function pdf(id: number, session = cookie) {
    return fetch(`${base}/api/ventas/${id}/ticket-pdf`, {
      headers: { cookie: session },
    });
  }
  const ticket = await pdf(ticketId);
  assert.equal(ticket.status, 200);
  assert.match(ticket.headers.get('content-type') || '', /application\/pdf/);
  assert.match(
    ticket.headers.get('content-disposition') || '',
    /inline;.*ticket-V-/,
  );
  assert.match(ticket.headers.get('cache-control') || '', /no-store/);
  await mkdir('tmp/pdfs', { recursive: true });
  const buffer = Buffer.from(await ticket.arrayBuffer());
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  await writeFile('tmp/pdfs/ticket-cash.pdf', buffer);
  const pendingPdf = await pdf(pendingSale.result.venta.idIngreso);
  assert.equal(pendingPdf.status, 200);
  await writeFile(
    'tmp/pdfs/ticket-pending.pdf',
    Buffer.from(await pendingPdf.arrayBuffer()),
  );
  assert.equal((await pdf(ticketId, '')).status, 401);
  assert.equal((await pdf(ticketId, viewerCookie)).status, 403);
  const readerRole = await prisma.rol.create({
    data: {
      nombre: 'LECTOR_TICKETS',
      permisos: {
        create: [PermisoSistema.VENTAS_VER, PermisoSistema.CAJA_VER].map(
          (nombre) => ({ permiso: { connect: { nombre } } }),
        ),
      },
    },
  });
  const reader = await prisma.usuario.create({
    data: {
      correo: 'north-reader@example.test',
      contrasena: 'unused',
      idRol: readerRole.idRol,
      idEstado: estado.idEstado,
      sucursales: { create: { idSucursal: second.idSucursal } },
    },
  });
  const readerCookie =
    'access_token=' +
    (await jwt.signAsync(
      { sub: reader.idUsuario, tipo: 'access' },
      { expiresIn: '1h' },
    ));
  assert.equal((await pdf(ticketId, readerCookie)).status, 403);
  assert.equal((await pdf(2147483647)).status, 404);
  // La reimpresión conserva nombres e IGV, incluso después de editar el catálogo.
  const product = await prisma.productoSucursal.findUniqueOrThrow({
    where: { idProductoSucursal: rice.idProductoSucursal },
    include: { producto: true },
  });
  await prisma.producto.update({
    where: { idProducto: product.idProducto },
    data: { nombre: 'Nombre cambiado después de vender' },
  });
  await prisma.cliente.update({
    where: { idCliente: anonymous.idCliente },
    data: { nombre: 'Cliente editado después de vender' },
  });
  await prisma.sucursalPerfil.update({
    where: { idSucursal: branch.idSucursal },
    data: { igv: '10.50' },
  });
  assert.equal((await pdf(ticketId)).status, 200);
  assert.deepEqual(
    (await prisma.ingreso.findUniqueOrThrow({ where: { idIngreso: ticketId } }))
      .ticketDatos,
    savedTicket,
  );
  await prisma.producto.update({
    where: { idProducto: product.idProducto },
    data: { nombre: product.producto.nombre },
  });
  await prisma.cliente.update({
    where: { idCliente: anonymous.idCliente },
    data: { nombre: anonymous.nombre },
  });
  await prisma.sucursalPerfil.update({
    where: { idSucursal: branch.idSucursal },
    data: { igv: '18.00' },
  });
  // Las ventas anteriores a la migración también se pueden imprimir.
  await prisma.ingreso.update({
    where: { idIngreso: ticketId },
    data: { ticketDatos: Prisma.DbNull },
  });
  assert.equal((await pdf(ticketId)).status, 200);
  await prisma.ingreso.update({
    where: { idIngreso: ticketId },
    data: { ticketDatos: savedTicket },
  });
  assert.equal(await prisma.ingreso.count(), beforeTickets);
  assert.equal(
    (
      await prisma.inventario.findUniqueOrThrow({
        where: { idInventario: rice.idInventario },
      })
    ).stock.toString(),
    beforeStock.stock.toString(),
  );
  // El dato recibido no permite confirmar cobros insuficientes ni cambiar un reintento.
  assert.equal(
    (
      await request('ventas', {
        ...sale,
        claveOperacion: randomUUID(),
        efectivoRecibido: '4.49',
      })
    ).status,
    400,
  );
  assert.equal(
    (await request('ventas', { ...sale, efectivoRecibido: '20.00' })).status,
    409,
  );
  assert.equal(await prisma.ingreso.count(), beforeTickets);
  console.log(
    'Tickets: PDF de 80 mm, vuelto, saldo pendiente, sesión, permisos, sucursal, reimpresión histórica y ventas antiguas verificados.',
  );
  await verificarReportes(
    base,
    cookie,
    branch.idSucursal,
    box.idCaja,
    viewerCookie,
    readerCookie,
  );
  if (process.env.REALTIME_UI_SCRIPT)
    await run([process.env.REALTIME_UI_SCRIPT], {
      UI_BASE_URL: base,
      UI_ACCESS_COOKIE: cookie.split('=').slice(1).join('='),
      UI_READER_ACCESS_COOKIE: readerCookie.split('=').slice(1).join('='),
      UI_CASH_ID: String(cash.idMedioPago),
      UI_BOX_ID: String(box.idCaja),
      UI_PRODUCT_ID: String(rice.idProductoSucursal),
      UI_WAREHOUSE_ID: String(rice.idAlmacen),
    });
  if (!process.env.REALTIME_UI_SCRIPT) {
    const closed = await request(
      `cajas/${box.idCaja}/cerrar`,
      { montoCierre: '204.50' },
      'PATCH',
    );
    assert.equal(closed.status, 200);
  } else
    assert.ok(
      (await prisma.caja.findUniqueOrThrow({ where: { idCaja: box.idCaja } }))
        .fechaCierre,
    );
  await delay(200);
  assert.ok(events.some((value: any) => value.recursos.includes('caja')));
  console.log(
    'Socket.IO: conexión real, cookies, permisos, aislamiento de sucursales, venta sin duplicados, rollback sin evento, clientes y cierre verificados.',
  );
} finally {
  for (const client of clients) client.disconnect();
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server!.once('exit', resolve));
    server.kill();
    await exited;
  }
  await prisma?.$disconnect();
  if (created) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
