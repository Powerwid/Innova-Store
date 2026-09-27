import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { ActualizarSucursalDto, CrearSucursalDto } from './dto/sucursal.dto.js';

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) { }

  listar() {
    return this.prisma.sucursal.findMany({
      include: {
        perfil: { include: { tipoDocumento: true } },
        _count: { select: { usuarios: true } },
      },
      orderBy: { idSucursal: 'desc' },
    });
  }

  async obtener(idSucursal: number) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { idSucursal },
      include: {
        perfil: { include: { tipoDocumento: true } },
        _count: { select: { usuarios: true } },
      },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    return sucursal;
  }

  async crear(dto: CrearSucursalDto) {
    await this.validarTipoDocumento(dto.perfil.idTipoDocumento);
    const sucursal = await this.prisma.sucursal.create({
      data: {
        nombre: dto.nombre,
        perfil: { create: dto.perfil },
      },
    });
    return {
      message: 'Sucursal creada correctamente',
      sucursal: await this.obtener(sucursal.idSucursal),
    };
  }

  async actualizar(idSucursal: number, dto: ActualizarSucursalDto) {
    const actual = await this.obtener(idSucursal);
    await this.validarTipoDocumento(dto.perfil?.idTipoDocumento);
    if (dto.activo === false && actual._count.usuarios > 0) {
      throw new ConflictException(
        'No se puede desactivar una sucursal con usuarios asignados',
      );
    }
    await this.prisma.sucursal.update({
      where: { idSucursal },
      data: {
        nombre: dto.nombre,
        activo: dto.activo,
        ...(dto.perfil
          ? { perfil: { upsert: { create: dto.perfil, update: dto.perfil } } }
          : {}),
      },
    });
    return {
      message: 'Sucursal actualizada correctamente',
      sucursal: await this.obtener(idSucursal),
    };
  }

  private async validarTipoDocumento(idTipoDocumento?: number) {
    if (idTipoDocumento == null) return;
    const tipo = await this.prisma.tipoDocumento.findUnique({
      where: { idTipoDocumento },
    });
    if (!tipo || !tipo.activo || tipo.nombre !== 'RUC')
      throw new NotFoundException('Tipo de documento RUC activo no encontrado');
  }
}
