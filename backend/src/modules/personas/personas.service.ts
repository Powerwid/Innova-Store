import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import type { ActualizarPersonaDto, CrearPersonaDto, ListarPersonasDto, TipoPersona } from './dto/persona.dto.js';

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) { }

  async listar(dto: ListarPersonasDto, actor: UsuarioAutenticado) {
    const buscar = dto.buscar || undefined;
    if (dto.tipo === 'CLIENTE') {
      const rows = await this.prisma.cliente.findMany({
        where: buscar
          ? {
            OR: [
              { nombre: { contains: buscar } },
              { numeroDocumento: { contains: buscar } },
              { correo: { contains: buscar } },
              { telefono: { contains: buscar } },
            ],
          }
          : undefined,
        include: { tipoDocumento: true },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row) => this.normalizar('CLIENTE', row));
    }

    const idSucursal = await this.validarSucursal(dto.idSucursal, actor);
    const rows = await this.prisma.proveedor.findMany({
      where: {
        idSucursal,
        ...(buscar
          ? {
            OR: [
              { nombre: { contains: buscar } },
              { numeroDocumento: { contains: buscar } },
              { correo: { contains: buscar } },
              { telefono: { contains: buscar } },
            ],
          }
          : {}),
      },
      include: { tipoDocumento: true, sucursal: { select: { idSucursal: true, nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.normalizar('PROVEEDOR', row));
  }

  async obtener(tipo: TipoPersona, id: number, actor: UsuarioAutenticado) {
    if (tipo === 'CLIENTE') {
      const row = await this.prisma.cliente.findUnique({
        where: { idCliente: id },
        include: { tipoDocumento: true },
      });
      if (!row) throw new NotFoundException('Cliente no encontrado');
      return this.normalizar(tipo, row);
    }

    const row = await this.prisma.proveedor.findUnique({
      where: { idProveedor: id },
      include: { tipoDocumento: true, sucursal: { select: { idSucursal: true, nombre: true } } },
    });
    if (!row) throw new NotFoundException('Proveedor no encontrado');
    await this.validarSucursal(row.idSucursal, actor);
    return this.normalizar(tipo, row);
  }

  async crear(dto: CrearPersonaDto, actor: UsuarioAutenticado) {
    const datos = await this.prepararDatos(dto);
    if (dto.tipo === 'CLIENTE') {
      await this.validarDocumentoDuplicado('CLIENTE', datos.idTipoDocumento, datos.numeroDocumento);
      const row = await this.prisma.cliente.create({ data: datos });
      return {
        message: 'Cliente creado correctamente',
        persona: await this.obtener('CLIENTE', row.idCliente, actor),
      };
    }

    const idSucursal = await this.validarSucursal(dto.idSucursal, actor);
    await this.validarDocumentoDuplicado(
      'PROVEEDOR',
      datos.idTipoDocumento,
      datos.numeroDocumento,
      undefined,
      idSucursal,
    );
    const row = await this.prisma.proveedor.create({
      data: { ...datos, idSucursal },
    });
    return {
      message: 'Proveedor creado correctamente',
      persona: await this.obtener('PROVEEDOR', row.idProveedor, actor),
    };
  }

  async actualizar(
    tipo: TipoPersona,
    id: number,
    dto: ActualizarPersonaDto,
    actor: UsuarioAutenticado,
  ) {
    const actual = await this.obtener(tipo, id, actor);
    const idTipoDocumento = dto.idTipoDocumento ?? actual.idTipoDocumento;
    const numeroDocumento = String(dto.numeroDocumento ?? actual.numeroDocumento).trim().toUpperCase();
    await this.validarDocumento(idTipoDocumento, numeroDocumento);

    const datos = this.limpiarOpcionales(dto);
    delete datos.idSucursal;

    if (tipo === 'CLIENTE') {
      await this.validarDocumentoDuplicado(tipo, idTipoDocumento, numeroDocumento, id);
      await this.prisma.cliente.update({ where: { idCliente: id }, data: datos });
      return {
        message: 'Cliente actualizado correctamente',
        persona: await this.obtener(tipo, id, actor),
      };
    }

    const idSucursal = dto.idSucursal ?? actual.idSucursal;
    await this.validarSucursal(idSucursal, actor);
    await this.validarDocumentoDuplicado(tipo, idTipoDocumento, numeroDocumento, id, idSucursal);
    await this.prisma.proveedor.update({
      where: { idProveedor: id },
      data: { ...datos, ...(dto.idSucursal !== undefined ? { idSucursal } : {}) },
    });
    return {
      message: 'Proveedor actualizado correctamente',
      persona: await this.obtener(tipo, id, actor),
    };
  }

  async eliminar(tipo: TipoPersona, id: number, actor: UsuarioAutenticado) {
    await this.obtener(tipo, id, actor);
    if (tipo === 'CLIENTE') {
      await this.prisma.cliente.delete({ where: { idCliente: id } });
      return { message: 'Cliente eliminado correctamente' };
    }
    await this.prisma.proveedor.delete({ where: { idProveedor: id } });
    return { message: 'Proveedor eliminado correctamente' };
  }

  private async prepararDatos(dto: CrearPersonaDto) {
    await this.validarDocumento(dto.idTipoDocumento, dto.numeroDocumento);
    return {
      nombre: this.normalizarNombre(dto.nombre),
      idTipoDocumento: dto.idTipoDocumento,
      numeroDocumento: dto.numeroDocumento.trim().toUpperCase(),
      direccion: dto.direccion?.trim() || null,
      ubigeo: dto.ubigeo?.trim() || null,
      correo: dto.correo?.trim() || null,
      telefono: dto.telefono?.trim() || null,
      activo: dto.activo,
    };
  }

  private limpiarOpcionales(dto: Record<string, unknown>) {
    const datos = { ...dto } as Record<string, any>;
    for (const campo of ['direccion', 'ubigeo', 'correo', 'telefono']) {
      if (datos[campo] === '') datos[campo] = null;
    }
    if (typeof datos.nombre === 'string') datos.nombre = this.normalizarNombre(datos.nombre);
    if (typeof datos.numeroDocumento === 'string') {
      datos.numeroDocumento = datos.numeroDocumento.trim().toUpperCase();
    }
    return datos;
  }

  private async validarDocumento(idTipoDocumento: number, numeroEntrada: string) {
    const tipo = await this.prisma.tipoDocumento.findUnique({ where: { idTipoDocumento } });
    if (!tipo || !tipo.activo) throw new NotFoundException('Tipo de documento activo no encontrado');

    const numero = numeroEntrada.trim().toUpperCase();
    const valido =
      (tipo.nombre === 'DNI' && /^\d{8}$/.test(numero)) ||
      (tipo.nombre === 'RUC' && /^\d{11}$/.test(numero)) ||
      (tipo.nombre === 'CE' && /^[A-Z0-9]{6,20}$/.test(numero));
    if (!valido) {
      throw new BadRequestException(
        tipo.nombre === 'DNI'
          ? 'El DNI debe tener 8 dígitos'
          : tipo.nombre === 'RUC'
            ? 'El RUC debe tener 11 dígitos'
            : 'El documento debe tener entre 6 y 20 caracteres alfanuméricos',
      );
    }
  }

  private async validarDocumentoDuplicado(
    tipo: TipoPersona,
    idTipoDocumento: number,
    numeroDocumento: string,
    idExcluir?: number,
    idSucursal?: number,
  ) {
    const duplicado = tipo === 'CLIENTE'
      ? await this.prisma.cliente.findFirst({
        where: {
          idTipoDocumento,
          numeroDocumento,
          ...(idExcluir ? { idCliente: { not: idExcluir } } : {}),
        },
      })
      : await this.prisma.proveedor.findFirst({
        where: {
          idSucursal,
          idTipoDocumento,
          numeroDocumento,
          ...(idExcluir ? { idProveedor: { not: idExcluir } } : {}),
        },
      });
    if (duplicado) throw new ConflictException('Este documento ya se encuentra registrado');
  }

  private async validarSucursal(idSucursal: number | undefined, actor: UsuarioAutenticado) {
    if (!idSucursal) throw new BadRequestException('Debe seleccionar una sucursal');
    if (!actor.sucursales.includes(idSucursal)) {
      throw new ForbiddenException('No tiene acceso a la sucursal seleccionada');
    }
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { idSucursal, activo: true },
      select: { idSucursal: true },
    });
    if (!sucursal) throw new NotFoundException('Sucursal activa no encontrada');
    return idSucursal;
  }

  private parseTipo(tipoEntrada: string): TipoPersona {
    const tipo = tipoEntrada.trim().toUpperCase();
    if (tipo !== 'CLIENTE' && tipo !== 'PROVEEDOR') {
      throw new BadRequestException('Tipo de persona inválido');
    }
    return tipo;
  }

  validarTipo(tipoEntrada: string) {
    return this.parseTipo(tipoEntrada);
  }

  private normalizarNombre(nombre: string) {
    return nombre
      .trim()
      .toLocaleLowerCase('es-PE')
      .replace(/\s+/g, ' ')
      .replace(/(^|[\s.'/-])(\p{L})/gu, (_m, separador: string, letra: string) =>
        `${separador}${letra.toLocaleUpperCase('es-PE')}`,
      );
  }

  private normalizar(tipo: TipoPersona, row: any) {
    return {
      id: tipo === 'CLIENTE' ? row.idCliente : row.idProveedor,
      tipo,
      nombre: row.nombre,
      idTipoDocumento: row.idTipoDocumento,
      numeroDocumento: row.numeroDocumento,
      direccion: row.direccion,
      ubigeo: row.ubigeo,
      correo: row.correo,
      telefono: row.telefono,
      activo: row.activo,
      idSucursal: row.idSucursal ?? null,
      sucursal: row.sucursal ?? null,
      tipoDocumento: row.tipoDocumento,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
