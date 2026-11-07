import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { type Db } from './operaciones.types.js';

@Injectable()
export class OperacionesAccesoService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async validarSucursal(
    idSucursal: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
    activa = true,
  ) {
    if (!actor.sucursales.includes(idSucursal)) {
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    }
    const sucursal = await db.sucursal.findUnique({ where: { idSucursal } });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    if (activa && !sucursal.activo) {
      throw new BadRequestException('La sucursal está inactiva');
    }
    return sucursal;
  }
}
