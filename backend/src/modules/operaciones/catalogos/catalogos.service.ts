import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  MOTIVOS_EGRESO_SISTEMA,
  MOTIVOS_INGRESO_SISTEMA,
} from '../compartido/operaciones.constants.js';
import { type ConsultaPaginada } from '../compartido/operaciones.types.js';
import { pagina, paginar } from '../compartido/operaciones.utils.js';
import {
  type MotivoInput,
  type TipoComprobanteInput,
} from './catalogos.types.js';

@Injectable()
export class CatalogosService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listarMotivosIngreso(q: ConsultaPaginada) {
    const where: Prisma.MotivoIngresoWhereInput = {
      motivo: q.buscar ? { contains: q.buscar } : undefined,
      activo: q.activo,
    };
    return pagina(
      q,
      this.prisma.motivoIngreso.findMany({
        where,
        ...paginar(q),
        orderBy: { motivo: 'asc' },
      }),
      this.prisma.motivoIngreso.count({ where }),
    );
  }

  async obtenerMotivoIngreso(idMotivoIngreso: number) {
    const motivo = await this.prisma.motivoIngreso.findUnique({
      where: { idMotivoIngreso },
    });
    if (!motivo) throw new NotFoundException('Motivo de ingreso no encontrado');
    return motivo;
  }

  async crearMotivoIngreso(dto: MotivoInput) {
    const motivoIngreso = await this.prisma.motivoIngreso.create({
      data: { motivo: dto.motivo, activo: dto.activo ?? true },
    });
    return { message: 'Motivo de ingreso creado correctamente', motivoIngreso };
  }

  async actualizarMotivoIngreso(id: number, dto: Partial<MotivoInput>) {
    await this.obtenerMotivoIngreso(id);
    if (MOTIVOS_INGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede modificarse',
      );
    }
    const motivoIngreso = await this.prisma.motivoIngreso.update({
      where: { idMotivoIngreso: id },
      data: dto,
    });
    return {
      message: 'Motivo de ingreso actualizado correctamente',
      motivoIngreso,
    };
  }

  async eliminarMotivoIngreso(id: number) {
    await this.obtenerMotivoIngreso(id);
    if (MOTIVOS_INGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede eliminarse',
      );
    }
    await this.prisma.motivoIngreso.delete({ where: { idMotivoIngreso: id } });
    return { message: 'Motivo de ingreso eliminado correctamente' };
  }

  listarMotivosEgreso(q: ConsultaPaginada) {
    const where: Prisma.MotivoEgresoWhereInput = {
      motivo: q.buscar ? { contains: q.buscar } : undefined,
      activo: q.activo,
    };
    return pagina(
      q,
      this.prisma.motivoEgreso.findMany({
        where,
        ...paginar(q),
        orderBy: { motivo: 'asc' },
      }),
      this.prisma.motivoEgreso.count({ where }),
    );
  }

  async obtenerMotivoEgreso(idMotivoEgreso: number) {
    const motivo = await this.prisma.motivoEgreso.findUnique({
      where: { idMotivoEgreso },
    });
    if (!motivo) throw new NotFoundException('Motivo de egreso no encontrado');
    return motivo;
  }

  async crearMotivoEgreso(dto: MotivoInput) {
    const motivoEgreso = await this.prisma.motivoEgreso.create({
      data: { motivo: dto.motivo, activo: dto.activo ?? true },
    });
    return { message: 'Motivo de egreso creado correctamente', motivoEgreso };
  }

  async actualizarMotivoEgreso(id: number, dto: Partial<MotivoInput>) {
    await this.obtenerMotivoEgreso(id);
    if (MOTIVOS_EGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede modificarse',
      );
    }
    const motivoEgreso = await this.prisma.motivoEgreso.update({
      where: { idMotivoEgreso: id },
      data: dto,
    });
    return {
      message: 'Motivo de egreso actualizado correctamente',
      motivoEgreso,
    };
  }

  async eliminarMotivoEgreso(id: number) {
    await this.obtenerMotivoEgreso(id);
    if (MOTIVOS_EGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede eliminarse',
      );
    }
    await this.prisma.motivoEgreso.delete({ where: { idMotivoEgreso: id } });
    return { message: 'Motivo de egreso eliminado correctamente' };
  }

  async obtenerTipoComprobante(idTipoComprobante: number) {
    const tipo = await this.prisma.tipoComprobante.findUnique({
      where: { idTipoComprobante },
    });
    if (!tipo) throw new NotFoundException('Tipo de comprobante no encontrado');
    return tipo;
  }

  async crearTipoComprobante(dto: TipoComprobanteInput) {
    const tipoComprobante = await this.prisma.tipoComprobante.create({
      data: {
        nombre: dto.nombre,
        codigoSunat: dto.codigoSunat ?? null,
      },
    });
    return {
      message: 'Tipo de comprobante creado correctamente',
      tipoComprobante,
    };
  }

  async actualizarTipoComprobante(
    id: number,
    dto: Partial<TipoComprobanteInput>,
  ) {
    await this.obtenerTipoComprobante(id);
    const tipoComprobante = await this.prisma.tipoComprobante.update({
      where: { idTipoComprobante: id },
      data: dto,
    });
    return {
      message: 'Tipo de comprobante actualizado correctamente',
      tipoComprobante,
    };
  }

  async eliminarTipoComprobante(id: number) {
    await this.obtenerTipoComprobante(id);
    await this.prisma.tipoComprobante.delete({
      where: { idTipoComprobante: id },
    });
    return { message: 'Tipo de comprobante eliminado correctamente' };
  }
  listarTiposComprobante(q: ConsultaPaginada) {
    const where: Prisma.TipoComprobanteWhereInput = {
      nombre: q.buscar ? { contains: q.buscar } : undefined,
    };
    return pagina(
      q,
      this.prisma.tipoComprobante.findMany({
        where,
        ...paginar(q),
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.tipoComprobante.count({ where }),
    );
  }
}
