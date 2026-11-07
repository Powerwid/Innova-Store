import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { prisma } from '../prisma/seeds/cliente-prisma.js';
import type { PrismaService } from '../src/database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../src/common/types/usuario-autenticado.js';
import { ReconocimientoService } from '../src/modules/reconocimiento/reconocimiento.service.js';
import { ReconocimientoClientService } from '../src/modules/reconocimiento/reconocimiento-client.service.js';
import { ReconocimientoStorageService } from '../src/modules/reconocimiento/reconocimiento-storage.service.js';
import { reconocimientoConfig } from '../src/modules/reconocimiento/reconocimiento.config.js';

const imageSchema = z
  .object({
    file: z.string().min(1),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    imageUrl: z.url(),
    pageUrl: z.url().nullable(),
    reviewStatus: z.enum(['approved', 'pending', 'rejected']),
  })
  .passthrough();
const manifestSchema = z
  .object({
    idProducto: z.number().int().positive(),
    nombre: z.string().min(1),
    createdAt: z.iso.datetime(),
    images: z.array(imageSchema).max(10),
  })
  .passthrough();

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const directory = await realpath(
  resolve(args[0] ?? '../output/referencias-web'),
);
const dryRun = args.includes('--dry-run');
const index = args.includes('--indexar');
const idsOption = args.find((arg) => arg.startsWith('--ids='));
const ids = idsOption
  ? new Set(idsOption.slice(6).split(',').map(Number))
  : null;
const files = (await readdir(resolve(directory, 'productos')))
  .filter(
    (name) =>
      /^\d+\.json$/.test(name) && (!ids || ids.has(Number(name.slice(0, -5)))),
  )
  .sort();
if (!files.length)
  throw new Error('No hay manifiestos de fotos para importar.');
const options = {
  ...reconocimientoConfig,
  storageDir: resolve(backend, reconocimientoConfig.storageDir),
  workerEnabled: false,
};
const client = new ReconocimientoClientService(
  new ConfigService(process.env),
  options,
);
const storage = new ReconocimientoStorageService(options);
const service = new ReconocimientoService(
  prisma as unknown as PrismaService,
  client,
  storage,
  options,
);
const summary: Array<{
  idProducto: number;
  nombre: string;
  referencias: number[];
}> = [];

try {
  const user = await prisma.usuario.findFirstOrThrow({
    where: { rol: { nombre: 'SUPERADMIN' }, estado: { nombre: 'ACTIVO' } },
    include: { rol: true, estado: true },
  });
  const actor: UsuarioAutenticado = {
    idUsuario: user.idUsuario,
    correo: user.correo,
    estado: user.estado.nombre,
    rol: { idRol: user.idRol, nombre: user.rol.nombre },
    permisos: [],
    sucursales: [],
  };
  // Valida el conjunto completo antes de registrar la primera foto.
  const prepared = [];
  for (const file of files) {
    const path = resolve(directory, 'productos', file);
    const manifest = manifestSchema.parse(
      JSON.parse(await readFile(path, 'utf8')),
    );
    const product = await prisma.producto.findUniqueOrThrow({
      where: { idProducto: manifest.idProducto },
    });
    if (
      product.nombre !== manifest.nombre ||
      product.createdAt.toISOString() !== manifest.createdAt
    )
      throw new Error(
        `El producto ${manifest.idProducto} cambió. Revisa la relación con el catálogo.`,
      );
    if (
      manifest.images.length !== 10 ||
      manifest.images.some((image) => image.reviewStatus !== 'approved')
    )
      throw new Error(
        `${manifest.nombre} necesita 10 imágenes revisadas y aprobadas.`,
      );
    const hashes = new Set<string>();
    for (const image of manifest.images) {
      const imagePath = await realpath(resolve(directory, image.file));
      const child = relative(directory, imagePath);
      if (
        isAbsolute(child) ||
        child === '..' ||
        child.startsWith('../') ||
        child.startsWith('..\\')
      )
        throw new Error('La imagen está fuera del directorio del conjunto.');
      const buffer = await readFile(imagePath);
      if (
        createHash('sha256').update(buffer).digest('hex') !== image.sha256 ||
        hashes.has(image.sha256)
      )
        throw new Error(`Imagen modificada o duplicada en ${manifest.nombre}.`);
      hashes.add(image.sha256);
      storage.validateImage({
        buffer,
        size: buffer.length,
        mimetype: image.mimeType,
      } as Express.Multer.File);
    }
    prepared.push({ path, manifest, product });
  }
  if (dryRun) {
    console.log(
      `Validación correcta: ${prepared.length} productos, ${prepared.length * 10} imágenes.`,
    );
  } else {
    if (index) await client.getHealth();
    for (const { path, manifest, product } of prepared) {
      const references = [];
      for (const image of manifest.images) {
        const buffer = await readFile(resolve(directory, image.file));
        const reference = await service.registrarReferencia(
          product.idProducto,
          {
            buffer,
            size: buffer.length,
            mimetype: image.mimeType,
          } as Express.Multer.File,
          actor,
          { permitirProductoInactivo: true },
        );
        image.idReferencia = reference.idReferencia;
        image.registeredAt = new Date().toISOString();
        references.push(reference.idReferencia);
      }
      // La primera referencia también sirve como foto visible del catálogo si no tenía una.
      if (!product.imagen)
        await prisma.producto.updateMany({
          where: {
            idProducto: product.idProducto,
            createdAt: product.createdAt,
            imagen: null,
          },
          data: {
            imagen: `/api/reconocimiento/referencias/${references[0]}/imagen`,
          },
        });
      await writeFile(path, JSON.stringify(manifest, null, 2));
      summary.push({
        idProducto: product.idProducto,
        nombre: product.nombre,
        referencias: references,
      });
      console.log(
        `${product.idProducto}: ${product.nombre} — ${references.length} fotos registradas.`,
      );
    }
    await writeFile(
      resolve(directory, 'importacion.json'),
      JSON.stringify(summary, null, 2),
    );
    if (index) {
      const importedIds = summary.flatMap((item) => item.referencias);
      for (;;) {
        await service.procesarPendientes();
        const counts = await prisma.referenciaVisual.groupBy({
          by: ['estado'],
          where: { idReferencia: { in: importedIds } },
          _count: { _all: true },
        });
        const pending = counts
          .filter((item) => ['PENDIENTE', 'PROCESANDO'].includes(item.estado))
          .reduce((total, item) => total + item._count._all, 0);
        console.log(
          JSON.stringify(
            Object.fromEntries(
              counts.map((item) => [item.estado, item._count._all]),
            ),
          ),
        );
        if (!pending) {
          if (counts.some((item) => item.estado === 'ERROR'))
            throw new Error(
              'Hay fotos con errores de indexación; consulta la galería de referencias.',
            );
          break;
        }
        await new Promise((done) => setTimeout(done, 1000));
      }
    }
    console.log(
      `Importación completada: ${summary.length} productos, ${summary.length * 10} fotos.`,
    );
  }
} finally {
  await service.onModuleDestroy();
  await prisma.$disconnect();
}
