// Prueba opt-in: MySQL, NestJS, HTTP Python, SigLIP2 y FAISS reales.
// Crea y elimina una base temporal; nunca aplica migraciones a la base principal.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import mariadb from 'mariadb';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../dist/database/prisma/prisma.service.js';
import { ReconocimientoService } from '../dist/modules/reconocimiento/reconocimiento.service.js';
import { ReconocimientoClientService } from '../dist/modules/reconocimiento/reconocimiento-client.service.js';
import { ReconocimientoStorageService } from '../dist/modules/reconocimiento/reconocimiento-storage.service.js';
import { reconocimientoConfig } from '../dist/modules/reconocimiento/reconocimiento.config.js';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recognitionDir = resolve(backendDir, '..', 'recognition-service');
const python =
  process.env.RECOGNITION_TEST_PYTHON ||
  join(
    recognitionDir,
    process.platform === 'win32'
      ? '.venv/Scripts/python.exe'
      : '.venv/bin/python',
  );
const source = new URL(process.env.DATABASE_URL || '');
const database = `innova_recognition_test_${Date.now()}_${randomUUID().slice(0, 8)}`;
if (!/^innova_recognition_test_\d+_[a-f0-9]{8}$/.test(database))
  throw new Error('Nombre de base temporal inválido');
const directory = await mkdtemp(join(tmpdir(), 'innova-recognition-smoke-'));
const timeout = Number(process.env.RECOGNITION_TEST_TIMEOUT_MS || 180000);
let admin,
  prisma,
  child,
  childExit,
  service,
  created = false;

async function run(command, args, options) {
  const task = spawn(command, args, options);
  let output = '';
  task.stdout?.on('data', (chunk) => {
    output += chunk;
  });
  task.stderr?.on('data', (chunk) => {
    output += chunk;
  });
  const code = await new Promise((resolveExit, reject) => {
    task.on('error', reject);
    task.on('exit', resolveExit);
  });
  if (code !== 0)
    throw new Error(
      `Falló la preparación de las migraciones de prueba: ${output}`,
    );
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const port = server.address().port;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

try {
  admin = await mariadb.createConnection({
    host: source.hostname,
    port: Number(source.port || 3306),
    user: decodeURIComponent(source.username),
    password: decodeURIComponent(source.password),
    allowPublicKeyRetrieval:
      process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL !== 'false',
  });
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  created = true;
  const testUrl = new URL(source);
  testUrl.pathname = `/${database}`;
  await run(
    process.execPath,
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'deploy',
      '--config',
      'prisma7.config.ts',
    ],
    {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL: testUrl.href },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  console.log('Migraciones verificadas en MySQL temporal.');
  const port = await availablePort();
  child = spawn(
    python,
    [
      '-m',
      'uvicorn',
      'app.main:app',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--workers',
      '1',
    ],
    {
      cwd: recognitionDir,
      env: {
        ...process.env,
        RECOGNITION_DEVICE: 'cpu',
        RECOGNITION_STORAGE_DIR: join(directory, 'python'),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  let serverErrors = '';
  child.stderr.on('data', (chunk) => {
    serverErrors = (serverErrors + chunk).slice(-4000);
  });
  childExit = new Promise((resolveExit) => {
    child.once('exit', resolveExit);
    child.once('error', resolveExit);
  });
  let launchError;
  child.on('error', (error) => {
    launchError = error;
  });
  const serviceUrl = `http://127.0.0.1:${port}`;
  let healthy = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    if (child.exitCode !== null)
      throw new Error(`El servicio Python no arrancó: ${serverErrors}`);
    try {
      const response = await fetch(`${serviceUrl}/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch {
      /* Esperar arranque. */
    }
    await delay(200);
  }
  if (!healthy)
    throw new Error(`El servicio Python no respondió: ${serverErrors}`);
  const config = new ConfigService({
    DATABASE_URL: testUrl.href,
    RECOGNITION_SERVICE_URL: serviceUrl,
  });
  const options = {
    ...reconocimientoConfig,
    storageDir: join(directory, 'nest'),
    timeoutMs: timeout,
    workerEnabled: false,
  };
  prisma = new PrismaService(config);
  await prisma.$connect();
  const client = new ReconocimientoClientService(config, options);
  const storage = new ReconocimientoStorageService(options);
  service = new ReconocimientoService(prisma, client, storage, options);
  const sucursal = await prisma.sucursal.create({
    data: { nombre: 'Sucursal smoke visual' },
  });
  const tipo = await prisma.tipoProducto.create({
    data: { nombre: 'Tipo smoke visual' },
  });
  const categoria = await prisma.categoria.create({
    data: { nombre: 'Categoria smoke visual' },
  });
  const unidad = await prisma.unidadMedida.create({
    data: { nombre: 'Unidad smoke visual', simbolo: 'ud' },
  });
  const producto = await prisma.producto.create({
    data: {
      nombre: 'Producto smoke visual',
      idTipoProducto: tipo.idTipoProducto,
      idCategoria: categoria.idCategoria,
      idUnidadMedida: unidad.idUnidadMedida,
    },
  });
  const asignacion = await prisma.productoSucursal.create({
    data: {
      idProducto: producto.idProducto,
      idSucursal: sucursal.idSucursal,
      precioCompra: '2.00',
      precioVenta: '3.50',
    },
  });
  const actor = {
    idUsuario: 1,
    correo: 'smoke@example.invalid',
    estado: 'ACTIVO',
    rol: { idRol: 1, nombre: 'SUPERADMIN' },
    permisos: [],
    sucursales: [sucursal.idSucursal],
  };
  const photoPath = resolve(
    process.argv[2] ||
      join(backendDir, '..', 'frontend/public/img/bg_fondo_rustico.jpg'),
  );
  const buffer = await readFile(photoPath);
  const mime = /\.png$/i.test(photoPath)
    ? 'image/png'
    : /\.webp$/i.test(photoPath)
      ? 'image/webp'
      : 'image/jpeg';
  const file = {
    buffer,
    mimetype: mime,
    size: buffer.length,
    originalname: basename(photoPath),
  };
  const referencia = await service.registrarReferencia(
    producto.idProducto,
    file,
    actor,
  );
  assert.equal(referencia.estado, 'PENDIENTE');
  const duplicate = await service.registrarReferencia(
    producto.idProducto,
    file,
    actor,
  );
  assert.equal(duplicate.idReferencia, referencia.idReferencia);
  assert.equal(await prisma.referenciaVisual.count(), 1);
  console.log('Ejecutando indexación real del modelo.');
  const procesadas = await service.procesarPendientes();
  const indexed = await prisma.referenciaVisual.findUniqueOrThrow({
    where: { idReferencia: referencia.idReferencia },
  });
  assert.equal(
    procesadas,
    1,
    indexed.ultimoError || 'La referencia no se pudo indexar',
  );
  assert.equal(indexed.estado, 'DISPONIBLE');
  assert.equal(indexed.dimension, 768);
  console.log('Foto vinculada a MySQL e indexada con SigLIP2/FAISS reales.');
  const result = await service.buscar(
    file,
    { idSucursal: sucursal.idSucursal, limite: 5 },
    actor,
  );
  assert.equal(result.estado, 'CANDIDATOS');
  assert.equal(
    result.candidatos[0].idProductoSucursal,
    asignacion.idProductoSucursal,
  );
  assert.equal(result.candidatos[0].precioVenta.toString(), '3.5');
  assert.ok(result.candidatos[0].similitud > 0.999);
  assert.equal(result.requiereConfirmacion, true);
  await service.retirarReferencia(referencia.idReferencia, actor);
  assert.equal(await service.procesarPendientes(), 1);
  assert.equal((await client.getHealth()).referenceCount, 0);
  assert.equal(
    (
      await service.buscar(
        file,
        { idSucursal: sucursal.idSucursal, limite: 5 },
        actor,
      )
    ).estado,
    'SIN_REFERENCIAS',
  );
  console.log(
    'OK: deduplicación, reconocimiento, precio de sucursal y retiro del índice. Precisión comercial no evaluada.',
  );
} catch (error) {
  console.error('Falló la prueba de reconocimiento real:', error.message);
  throw error;
} finally {
  if (service) await service.onModuleDestroy();
  if (prisma) await prisma.$disconnect();
  if (child && child.exitCode === null) {
    child.kill();
    await Promise.race([childExit, delay(5000)]);
  }
  if (admin) {
    if (created) await admin.query(`DROP DATABASE \`${database}\``);
    await admin.end();
  }
  // Verificar el destino absoluto antes de borrar recursivamente únicamente el fixture propio.
  const target = resolve(directory);
  if (
    dirname(target).toLowerCase() === resolve(tmpdir()).toLowerCase() &&
    basename(target).startsWith('innova-recognition-smoke-')
  ) {
    await rm(target, { recursive: true, force: true });
  }
}
