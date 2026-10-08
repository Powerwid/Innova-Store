import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { RolSistema } from '../../common/enums/rol-sistema.enum.js';
import type {
  ListarReferenciasDto,
  ReconocerProductoDto,
} from './dto/reconocimiento.dto.js';
import { ReconocimientoClientService } from './reconocimiento-client.service.js';
import { ReconocimientoStorageService } from './reconocimiento-storage.service.js';
import {
  RECONOCIMIENTO_CONFIG,
  reconocimientoConfig,
} from './reconocimiento.config.js';
import type { ReconocimientoConfig } from './reconocimiento.config.js';

const referenciaSelect = {
  idReferencia: true,
  idProducto: true,
  activo: true,
  estado: true,
  modeloVersion: true,
  dimension: true,
  intentos: true,
  ultimoError: true,
  proximoIntento: true,
  indexadoAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
const pendiente = {
  estado: 'PENDIENTE' as const,
  intentos: 0,
  ultimoError: null,
  proximoIntento: null,
  leaseToken: null,
  bloqueadoHasta: null,
  modeloVersion: null,
  dimension: null,
  indexadoAt: null,
};

@Injectable()
export class ReconocimientoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconocimientoService.name);
  private timer?: ReturnType<typeof setInterval>;
  private processing?: Promise<number>;
  private stopping = false;
  private readonly minScore: number;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReconocimientoClientService)
    private readonly client: ReconocimientoClientService,
    @Inject(ReconocimientoStorageService)
    private readonly storage: ReconocimientoStorageService,
    @Optional()
    @Inject(RECONOCIMIENTO_CONFIG)
    private readonly options: ReconocimientoConfig = reconocimientoConfig,
  ) {
    const score = options.minScore;
    if (!Number.isFinite(score) || score < -1 || score > 1) {
      throw new Error(
        'La similitud mínima del reconocimiento debe estar entre -1 y 1',
      );
    }
    this.minScore = score;
  }

  onModuleInit() {
    if (!this.client.isConfigured() || !this.options.workerEnabled) return;
    const interval = Math.max(1000, this.options.pollMs);
    this.timer = setInterval(() => this.kickWorker(), interval);
    this.timer.unref();
    this.kickWorker();
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.processing;
  }

  private kickWorker() {
    if (
      this.stopping ||
      this.processing ||
      !this.client.isConfigured() ||
      !this.options.workerEnabled
    )
      return;
    this.processing = this.procesarPendientes()
      .catch(() => {
        this.logger.warn(
          'No se pudo consultar la cola de reconocimiento; se reintentará. Verifique las migraciones y la conexión.',
        );
        return 0;
      })
      .finally(() => {
        this.processing = undefined;
      });
  }

  private scopeProducto(actor: UsuarioAutenticado): Prisma.ProductoWhereInput {
    return actor.rol.nombre === RolSistema.SUPERADMIN
      ? {}
      : {
          sucursales: {
            some: { idSucursal: { in: actor.sucursales }, estado: true },
          },
        };
  }

  private async validarProducto(
    idProducto: number,
    actor: UsuarioAutenticado,
    activo = false,
  ) {
    const producto = await this.prisma.producto.findUnique({
      where: { idProducto },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (
      actor.rol.nombre !== RolSistema.SUPERADMIN &&
      !(await this.prisma.productoSucursal.findFirst({
        where: {
          idProducto,
          idSucursal: { in: actor.sucursales },
          estado: true,
        },
        select: { idProductoSucursal: true },
      }))
    )
      throw new ForbiddenException('No tiene acceso a este producto');
    if (activo && !producto.estado)
      throw new BadRequestException('El producto está inactivo');
    return producto;
  }

  private async validarReferencia(
    idReferencia: number,
    actor: UsuarioAutenticado,
  ) {
    const referencia = await this.prisma.referenciaVisual.findUnique({
      where: { idReferencia },
    });
    if (!referencia)
      throw new NotFoundException('Referencia visual no encontrada');
    await this.validarProducto(referencia.idProducto, actor);
    return referencia;
  }

  private imagen(file: Express.Multer.File | undefined) {
    if (!file)
      throw new BadRequestException('Adjunte una imagen en el campo file');
    this.storage.validateImage(file);
    return file;
  }

  private publicReference<T extends { idReferencia: number }>(row: T) {
    return {
      ...row,
      imagenUrl: `/api/reconocimiento/referencias/${row.idReferencia}/imagen`,
    };
  }

  async estado(actor: UsuarioAutenticado) {
    const counts = await this.prisma.referenciaVisual.groupBy({
      by: ['estado'],
      where: { producto: this.scopeProducto(actor) },
      _count: { _all: true },
    });
    const configured = this.client.isConfigured();
    let service: Awaited<
      ReturnType<ReconocimientoClientService['getHealth']>
    > | null = null;
    if (configured) {
      try {
        service = await this.client.getHealth();
      } catch {
        /* Estado explícito; el catálogo sigue disponible. */
      }
    }
    return {
      configurado: configured,
      disponible: service?.status === 'ok',
      servicio: service,
      referencias: Object.fromEntries(
        counts.map((row) => [row.estado, row._count._all]),
      ),
      similitudMinima: this.minScore,
      umbralCalibrado: false,
      requiereConfirmacion: true,
    };
  }

  async listarReferencias(
    idProducto: number,
    dto: ListarReferenciasDto,
    actor: UsuarioAutenticado,
  ) {
    await this.validarProducto(idProducto, actor);
    const where = { idProducto };
    const [data, total] = await Promise.all([
      this.prisma.referenciaVisual.findMany({
        where,
        select: referenciaSelect,
        orderBy: { idReferencia: 'desc' },
        skip: (dto.pagina - 1) * dto.limite,
        take: dto.limite,
      }),
      this.prisma.referenciaVisual.count({ where }),
    ]);
    return {
      data: data.map((row) => this.publicReference(row)),
      total,
      ...dto,
    };
  }

  async registrarReferencia(
    idProducto: number,
    file: Express.Multer.File | undefined,
    actor: UsuarioAutenticado,
  ) {
    await this.validarProducto(idProducto, actor, true);
    const image = this.imagen(file);
    const saved = await this.storage.save(image);
    let row;
    try {
      row = await this.prisma.referenciaVisual.upsert({
        where: { idProducto_sha256: { idProducto, sha256: saved.sha256 } },
        create: {
          idProducto,
          archivo: saved.archivo,
          sha256: saved.sha256,
          mimeType: saved.mimeType,
        },
        update: {},
      });
    } catch (error) {
      await this.storage.remove(saved.archivo);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'El producto cambió durante el registro; vuelva a intentarlo',
        );
      }
      throw error;
    }
    // Un mismo archivo para el mismo producto utiliza siempre el mismo ID de referencia.
    if (row.archivo !== saved.archivo) await this.storage.remove(saved.archivo);
    if (!row.activo) {
      row = await this.prisma.referenciaVisual.update({
        where: { idReferencia: row.idReferencia },
        data: { ...pendiente, activo: true },
      });
    }
    this.kickWorker();
    const publicRow = await this.prisma.referenciaVisual.findUniqueOrThrow({
      where: { idReferencia: row.idReferencia },
      select: referenciaSelect,
    });
    return this.publicReference(publicRow);
  }

  async obtenerImagen(idReferencia: number, actor: UsuarioAutenticado) {
    const row = await this.validarReferencia(idReferencia, actor);
    try {
      return {
        buffer: await this.storage.read(row.archivo),
        mimeType: row.mimeType,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new NotFoundException(
          'La foto de referencia no está disponible; revise el almacenamiento',
        );
      throw error;
    }
  }

  async reintentarReferencia(idReferencia: number, actor: UsuarioAutenticado) {
    const row = await this.validarReferencia(idReferencia, actor);
    if (!row.activo)
      throw new BadRequestException(
        'La referencia está retirada; vuelva a registrar la foto para activarla',
      );
    await this.validarProducto(row.idProducto, actor, true);
    const result = await this.prisma.referenciaVisual.update({
      where: { idReferencia },
      data: pendiente,
      select: referenciaSelect,
    });
    this.kickWorker();
    return this.publicReference(result);
  }

  async retirarReferencia(idReferencia: number, actor: UsuarioAutenticado) {
    await this.validarReferencia(idReferencia, actor);
    const result = await this.prisma.referenciaVisual.update({
      where: { idReferencia },
      data: { ...pendiente, activo: false },
      select: referenciaSelect,
    });
    this.kickWorker();
    return this.publicReference(result);
  }

  async reindexarProducto(idProducto: number, actor: UsuarioAutenticado) {
    await this.validarProducto(idProducto, actor, true);
    const result = await this.prisma.referenciaVisual.updateMany({
      where: { idProducto, activo: true },
      data: pendiente,
    });
    this.kickWorker();
    return { idProducto, referenciasPendientes: result.count };
  }

  async reindexarTodo() {
    const result = await this.prisma.referenciaVisual.updateMany({
      where: { activo: true, producto: { estado: true } },
      data: pendiente,
    });
    this.kickWorker();
    return { referenciasPendientes: result.count };
  }

  async buscar(
    file: Express.Multer.File | undefined,
    dto: ReconocerProductoDto,
    actor: UsuarioAutenticado,
  ) {
    if (!actor.sucursales.includes(dto.idSucursal))
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { idSucursal: dto.idSucursal },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    if (!sucursal.activo)
      throw new BadRequestException('La sucursal está inactiva');
    const image = this.imagen(file);
    const health = await this.client.getHealth();
    const refs = await this.prisma.referenciaVisual.findMany({
      where: {
        activo: true,
        estado: 'DISPONIBLE',
        producto: {
          estado: true,
          sucursales: { some: { idSucursal: dto.idSucursal, estado: true } },
        },
      },
      select: { idReferencia: true, idProducto: true, modeloVersion: true },
    });
    const validRefs = refs.filter(
      (row) => row.modeloVersion === health.modelVersion,
    );
    const base = {
      idSucursal: dto.idSucursal,
      modeloVersion: health.modelVersion,
      similitudMinima: this.minScore,
      requiereConfirmacion: true,
      candidatos: [],
    };
    if (!validRefs.length) {
      if (refs.length)
        throw new ConflictException(
          'El modelo cambió. Reindexe las fotos de los productos antes de reconocer',
        );
      return {
        ...base,
        estado: 'SIN_REFERENCIAS',
        mensaje:
          'Registre fotos reales de los productos y espere a que estén disponibles',
      };
    }
    if (!health.referenceCount)
      throw new ConflictException(
        'El índice visual está vacío. Reindexe las fotos de los productos',
      );
    const result = await this.client.search(
      image,
      validRefs.map((row) => row.idReferencia),
      50,
    );
    if (result.modelVersion !== health.modelVersion)
      throw new ConflictException(
        'El modelo cambió durante la consulta; vuelva a intentarlo',
      );
    // Releer protege de referencias retiradas o reindexadas mientras se ejecutaba la inferencia.
    const current = await this.prisma.referenciaVisual.findMany({
      where: {
        idReferencia: { in: result.matches.map((row) => row.idReferencia) },
        activo: true,
        estado: 'DISPONIBLE',
        modeloVersion: result.modelVersion,
      },
      select: { idReferencia: true, idProducto: true },
    });
    const allowed = new Map(
      validRefs.map((row) => [row.idReferencia, row.idProducto]),
    );
    const currentIds = new Set(current.map((row) => row.idReferencia));
    const best = new Map<number, { idReferencia: number; score: number }>();
    for (const match of result.matches) {
      if (
        !currentIds.has(match.idReferencia) ||
        allowed.get(match.idReferencia) !== match.idProducto ||
        match.score < this.minScore
      )
        continue;
      if (
        !best.has(match.idProducto) ||
        match.score > best.get(match.idProducto)!.score
      ) {
        best.set(match.idProducto, {
          idReferencia: match.idReferencia,
          score: match.score,
        });
      }
    }
    const products = await this.prisma.productoSucursal.findMany({
      where: {
        idSucursal: dto.idSucursal,
        estado: true,
        idProducto: { in: [...best.keys()] },
        producto: { estado: true },
      },
      include: {
        producto: {
          include: { unidadMedida: true, categoria: true, tipoProducto: true },
        },
      },
    });
    const candidatos = products
      .map((row) => ({
        idProducto: row.idProducto,
        idProductoSucursal: row.idProductoSucursal,
        nombre: row.producto.nombre,
        imagen: row.producto.imagen,
        precioCompra: row.precioCompra,
        precioVenta: row.precioVenta,
        unidadMedida: row.producto.unidadMedida,
        categoria: row.producto.categoria,
        idReferencia: best.get(row.idProducto)!.idReferencia,
        similitud: best.get(row.idProducto)!.score,
      }))
      .sort((a, b) => b.similitud - a.similitud)
      .slice(0, dto.limite);
    return {
      ...base,
      candidatos,
      estado: candidatos.length ? 'CANDIDATOS' : 'SIN_COINCIDENCIAS',
      mensaje: candidatos.length
        ? 'Confirme el producto y su cantidad o peso antes de agregarlo'
        : 'No hay coincidencias suficientes; utilice la selección manual',
    };
  }

  private elegibles(now: Date): Prisma.ReferenciaVisualWhereInput {
    return {
      OR: [
        {
          estado: 'PENDIENTE',
          OR: [{ proximoIntento: null }, { proximoIntento: { lte: now } }],
        },
        { estado: 'ERROR', proximoIntento: { lte: now } },
        { estado: 'PROCESANDO', bloqueadoHasta: { lte: now } },
      ],
    };
  }

  // La reclamación condicional en MySQL evita procesar el mismo trabajo desde dos workers.
  // El token impide que una respuesta antigua reactive una referencia retirada/reindexada.
  async procesarPendientes() {
    if (!this.client.isConfigured() || this.stopping) return 0;
    const rows = await this.prisma.referenciaVisual.findMany({
      where: this.elegibles(new Date()),
      orderBy: { idReferencia: 'asc' },
      take: 8,
    });
    let processed = 0;
    for (const row of rows) {
      if (this.stopping) break;
      const leaseToken = randomUUID();
      const timeout = this.options.timeoutMs;
      const claimed = await this.prisma.referenciaVisual.updateMany({
        where: {
          AND: [
            {
              idReferencia: row.idReferencia,
              updatedAt: row.updatedAt,
              activo: row.activo,
              leaseToken: row.leaseToken,
            },
            this.elegibles(new Date()),
          ],
        },
        data: {
          estado: 'PROCESANDO',
          leaseToken,
          bloqueadoHasta: new Date(
            Date.now() + Math.max(900000, timeout + 60000),
          ),
          intentos: { increment: 1 },
        },
      });
      if (!claimed.count) continue;
      const leaseWhere = { idReferencia: row.idReferencia, leaseToken };
      try {
        if (!row.activo) {
          await this.client.deleteReference(row.idReferencia);
          await this.prisma.referenciaVisual.updateMany({
            where: leaseWhere,
            data: {
              estado: 'RETIRADA',
              leaseToken: null,
              bloqueadoHasta: null,
              ultimoError: null,
              proximoIntento: null,
            },
          });
        } else {
          const buffer = await this.storage.read(row.archivo);
          const indexed = await this.client.indexReference(
            row.idReferencia,
            row.idProducto,
            { buffer, mimetype: row.mimeType },
          );
          if (
            indexed.idReferencia !== row.idReferencia ||
            indexed.idProducto !== row.idProducto
          ) {
            throw new ConflictException(
              'La respuesta del servicio no corresponde a la referencia enviada',
            );
          }
          await this.prisma.referenciaVisual.updateMany({
            where: leaseWhere,
            data: {
              estado: 'DISPONIBLE',
              modeloVersion: indexed.modelVersion,
              dimension: indexed.dimension,
              indexadoAt: new Date(),
              leaseToken: null,
              bloqueadoHasta: null,
              ultimoError: null,
              proximoIntento: null,
            },
          });
        }
        processed++;
      } catch (error) {
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const retry = status >= 500;
        const message =
          error instanceof HttpException
            ? error.message.slice(0, 500)
            : 'No se pudo procesar la referencia visual';
        await this.prisma.referenciaVisual.updateMany({
          where: leaseWhere,
          data: {
            estado: 'ERROR',
            ultimoError: message,
            leaseToken: null,
            bloqueadoHasta: null,
            proximoIntento: retry
              ? new Date(
                  Date.now() +
                    Math.min(900000, 30000 * 2 ** Math.min(row.intentos, 5)),
                )
              : null,
          },
        });
      }
    }
    return processed;
  }
}
