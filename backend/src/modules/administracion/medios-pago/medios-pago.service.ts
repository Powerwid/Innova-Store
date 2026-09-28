import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { MedioPagoDto } from './dto/medio-pago.dto.js';

const MEDIO_PAGO_FRACCIONADO = 'Fraccionado';

@Injectable()
export class MediosPagoService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.medioPago.findMany({ orderBy: { idMedioPago: 'asc' } });
  }

  async crear(dto: MedioPagoDto) {
    const existente = await this.prisma.medioPago.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existente) throw new ConflictException('El medio de pago ya existe');
    const medioPago = await this.prisma.medioPago.create({ data: dto });
    return { message: 'Medio de pago creado correctamente', medioPago };
  }

  async actualizar(idMedioPago: number, dto: MedioPagoDto) {
    const actual = await this.prisma.medioPago.findUnique({
      where: { idMedioPago },
    });
    if (!actual) throw new NotFoundException('Medio de pago no encontrado');
    if (
      actual.nombre === MEDIO_PAGO_FRACCIONADO &&
      dto.nombre !== MEDIO_PAGO_FRACCIONADO
    ) {
      throw new ConflictException(
        'Fraccionado es una opción reservada y no puede modificarse',
      );
    }
    if (actual.nombre !== dto.nombre) {
      const existente = await this.prisma.medioPago.findUnique({
        where: { nombre: dto.nombre },
      });
      if (existente) throw new ConflictException('El medio de pago ya existe');
    }
    const medioPago = await this.prisma.medioPago.update({
      where: { idMedioPago },
      data: dto,
    });
    return { message: 'Medio de pago actualizado correctamente', medioPago };
  }

  async eliminar(idMedioPago: number) {
    const actual = await this.prisma.medioPago.findUnique({
      where: { idMedioPago },
    });
    if (!actual) throw new NotFoundException('Medio de pago no encontrado');
    if (actual.nombre === MEDIO_PAGO_FRACCIONADO) {
      throw new ConflictException(
        'Fraccionado es una opción reservada y no puede eliminarse',
      );
    }
    await this.prisma.medioPago.delete({ where: { idMedioPago } });
    return { message: 'Medio de pago eliminado correctamente' };
  }
}
