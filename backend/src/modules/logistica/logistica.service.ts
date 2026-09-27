import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import type {
  TipoProductoDto,
  CategoriaDto,
  UnidadMedidaDto,
  ProductoDto,
  ProductoSucursalDto,
  AlmacenDto,
  InventarioDto,
  MovimientoDto,
  ListarDto,
} from './dto/logistica.dto.js';
import {
  CONFIG_STOCK_NEGATIVO,
  MOVIMIENTO_INICIAL,
} from './logistica.constants.js';

const productoInclude = {
  tipoProducto: true,
  categoria: true,
  unidadMedida: true,
} as const;
const inventarioInclude = {
  almacen: true,
  productoSucursal: { include: { producto: { include: productoInclude } } },
} as const;
const movimientoInclude = {
  tipoMovimiento: true,
  inventario: { include: inventarioInclude },
  usuario: {
    select: {
      idUsuario: true,
      perfil: { select: { nombres: true, apellidos: true } },
    },
  },
} as const;

@Injectable()
export class LogisticaService {
  constructor(private readonly prisma: PrismaService) {}

  configuracionesGlobales() {
    return this.prisma.configuracionGlobal.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerConfiguracionGlobal(nombre: string) {
    const configuracion = await this.prisma.configuracionGlobal.findUnique({
      where: { nombre },
    });
    if (!configuracion)
      throw new NotFoundException('Configuración no encontrada');
    return configuracion;
  }

  actualizarConfiguracionGlobal(nombre: string, activo: boolean) {
    return this.prisma.configuracionGlobal.update({
      where: { nombre },
      data: { activo },
    });
  }

  private async pagina<T>(
    q: ListarDto,
    datos: Promise<T[]>,
    cantidad: Promise<number>,
  ) {
    const [data, total] = await Promise.all([datos, cantidad]);
    return { data, total, pagina: q.pagina, limite: q.limite };
  }
  private paginar(q: ListarDto) {
    return { skip: (q.pagina - 1) * q.limite, take: q.limite };
  }
  private catalogoWhere(q: ListarDto) {
    return {
      nombre: q.buscar ? { contains: q.buscar } : undefined,
      estado: q.estado,
    };
  }
  private sucursales(q: ListarDto, actor: UsuarioAutenticado) {
    if (
      q.idSucursal !== undefined &&
      !actor.sucursales.includes(q.idSucursal)
    ) {
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    }
    return q.idSucursal ?? { in: actor.sucursales };
  }
  private async validarSucursal(
    idSucursal: number,
    actor: UsuarioAutenticado,
    db: Prisma.TransactionClient = this.prisma,
    activa = true,
  ) {
    if (!actor.sucursales.includes(idSucursal))
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    const row = await db.sucursal.findUnique({ where: { idSucursal } });
    if (!row) throw new NotFoundException('Sucursal no encontrada');
    if (activa && !row.activo)
      throw new BadRequestException('La sucursal está inactiva');
    return row;
  }

  listarTipoProducto(q: ListarDto) {
    const where = this.catalogoWhere(q);
    return this.pagina(
      q,
      this.prisma.tipoProducto.findMany({
        where,
        ...this.paginar(q),
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.tipoProducto.count({ where }),
    );
  }
  async obtenerTipoProducto(id: number) {
    const row = await this.prisma.tipoProducto.findUnique({
      where: { idTipoProducto: id },
    });
    if (!row) throw new NotFoundException('Registro no encontrado');
    return row;
  }
  crearTipoProducto(dto: TipoProductoDto) {
    return this.prisma.tipoProducto.create({ data: dto });
  }
  actualizarTipoProducto(id: number, dto: Partial<TipoProductoDto>) {
    return this.prisma.tipoProducto.update({
      where: { idTipoProducto: id },
      data: dto,
    });
  }
  async eliminarTipoProducto(id: number) {
    await this.prisma.tipoProducto.delete({ where: { idTipoProducto: id } });
    return { message: 'Registro eliminado' };
  }

  listarCategoria(q: ListarDto) {
    const where = this.catalogoWhere(q);
    return this.pagina(
      q,
      this.prisma.categoria.findMany({
        where,
        ...this.paginar(q),
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.categoria.count({ where }),
    );
  }
  async obtenerCategoria(id: number) {
    const row = await this.prisma.categoria.findUnique({
      where: { idCategoria: id },
    });
    if (!row) throw new NotFoundException('Registro no encontrado');
    return row;
  }
  crearCategoria(dto: CategoriaDto) {
    return this.prisma.categoria.create({ data: dto });
  }
  actualizarCategoria(id: number, dto: Partial<CategoriaDto>) {
    return this.prisma.categoria.update({
      where: { idCategoria: id },
      data: dto,
    });
  }
  async eliminarCategoria(id: number) {
    await this.prisma.categoria.delete({ where: { idCategoria: id } });
    return { message: 'Registro eliminado' };
  }

  listarUnidadMedida(q: ListarDto) {
    const where = this.catalogoWhere(q);
    return this.pagina(
      q,
      this.prisma.unidadMedida.findMany({
        where,
        ...this.paginar(q),
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.unidadMedida.count({ where }),
    );
  }
  async obtenerUnidadMedida(id: number) {
    const row = await this.prisma.unidadMedida.findUnique({
      where: { idUnidadMedida: id },
    });
    if (!row) throw new NotFoundException('Registro no encontrado');
    return row;
  }
  crearUnidadMedida(dto: UnidadMedidaDto) {
    return this.prisma.unidadMedida.create({ data: dto });
  }
  actualizarUnidadMedida(id: number, dto: Partial<UnidadMedidaDto>) {
    return this.prisma.unidadMedida.update({
      where: { idUnidadMedida: id },
      data: dto,
    });
  }
  async eliminarUnidadMedida(id: number) {
    await this.prisma.unidadMedida.delete({ where: { idUnidadMedida: id } });
    return { message: 'Registro eliminado' };
  }

  listarProductos(q: ListarDto) {
    const where: Prisma.ProductoWhereInput = {
      ...this.catalogoWhere(q),
      idCategoria: q.idCategoria,
      idTipoProducto: q.idTipoProducto,
    };
    return this.pagina(
      q,
      this.prisma.producto.findMany({
        where,
        include: productoInclude,
        ...this.paginar(q),
        orderBy: { idProducto: 'desc' },
      }),
      this.prisma.producto.count({ where }),
    );
  }
  async obtenerProducto(
    idProducto: number,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const row = await db.producto.findUnique({
      where: { idProducto },
      include: productoInclude,
    });
    if (!row) throw new NotFoundException('Producto no encontrado');
    return row;
  }
  private async validarCatalogos(
    dto: Partial<ProductoDto>,
    db: Prisma.TransactionClient,
  ) {
    if (
      dto.idTipoProducto !== undefined &&
      !(await db.tipoProducto.findFirst({
        where: { idTipoProducto: dto.idTipoProducto, estado: true },
      }))
    )
      throw new BadRequestException('Tipo de producto activo no encontrado');
    if (
      dto.idCategoria !== undefined &&
      !(await db.categoria.findFirst({
        where: { idCategoria: dto.idCategoria, estado: true },
      }))
    )
      throw new BadRequestException('Categoría activa no encontrada');
    if (
      dto.idUnidadMedida !== undefined &&
      !(await db.unidadMedida.findFirst({
        where: { idUnidadMedida: dto.idUnidadMedida, estado: true },
      }))
    )
      throw new BadRequestException('Unidad de medida activa no encontrada');
  }
  crearProducto(dto: ProductoDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarCatalogos(dto, tx);
      return tx.producto.create({ data: dto, include: productoInclude });
    });
  }
  actualizarProducto(id: number, dto: Partial<ProductoDto>) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_producto FROM productos WHERE id_producto = ${id} FOR UPDATE`;
      const actual = await this.obtenerProducto(id, tx);
      if (
        dto.idUnidadMedida !== undefined &&
        dto.idUnidadMedida !== actual.idUnidadMedida &&
        (await tx.productoSucursal.count({ where: { idProducto: id } }))
      ) {
        throw new ConflictException(
          'No se puede cambiar la unidad de un producto asignado a sucursales',
        );
      }
      await this.validarCatalogos(dto, tx);
      return tx.producto.update({
        where: { idProducto: id },
        data: dto,
        include: productoInclude,
      });
    });
  }
  async eliminarProducto(id: number) {
    await this.prisma.producto.delete({ where: { idProducto: id } });
    return { message: 'Producto eliminado' };
  }

  listarProductoSucursal(q: ListarDto, actor: UsuarioAutenticado) {
    const where: Prisma.ProductoSucursalWhereInput = {
      idSucursal: this.sucursales(q, actor),
      idProducto: q.idProducto,
      estado: q.estado,
      producto: q.buscar ? { nombre: { contains: q.buscar } } : undefined,
    };
    return this.pagina(
      q,
      this.prisma.productoSucursal.findMany({
        where,
        include: { producto: { include: productoInclude }, sucursal: true },
        ...this.paginar(q),
        orderBy: { idProductoSucursal: 'desc' },
      }),
      this.prisma.productoSucursal.count({ where }),
    );
  }
  async obtenerProductoSucursal(
    id: number,
    actor: UsuarioAutenticado,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const row = await db.productoSucursal.findUnique({
      where: { idProductoSucursal: id },
      include: { producto: { include: productoInclude }, sucursal: true },
    });
    if (!row) throw new NotFoundException('Producto de sucursal no encontrado');
    await this.validarSucursal(row.idSucursal, actor, db, false);
    return row;
  }
  crearProductoSucursal(dto: ProductoSucursalDto, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarSucursal(dto.idSucursal, actor, tx);
      await tx.$queryRaw`SELECT id_producto FROM productos WHERE id_producto = ${dto.idProducto} FOR UPDATE`;
      const producto = await this.obtenerProducto(dto.idProducto, tx);
      if (!producto.estado)
        throw new BadRequestException('El producto está inactivo');
      return tx.productoSucursal.create({ data: dto });
    });
  }
  async actualizarProductoSucursal(
    id: number,
    dto: Partial<
      Pick<ProductoSucursalDto, 'precioCompra' | 'precioVenta' | 'estado'>
    >,
    actor: UsuarioAutenticado,
  ) {
    const row = await this.obtenerProductoSucursal(id, actor);
    await this.validarSucursal(row.idSucursal, actor);
    return this.prisma.productoSucursal.update({
      where: { idProductoSucursal: id },
      data: dto,
    });
  }
  async eliminarProductoSucursal(id: number, actor: UsuarioAutenticado) {
    const row = await this.obtenerProductoSucursal(id, actor);
    await this.validarSucursal(row.idSucursal, actor);
    await this.prisma.productoSucursal.delete({
      where: { idProductoSucursal: id },
    });
    return { message: 'Producto retirado de la sucursal' };
  }

  listarAlmacenes(q: ListarDto, actor: UsuarioAutenticado) {
    const where = {
      ...this.catalogoWhere(q),
      idSucursal: this.sucursales(q, actor),
    };
    return this.pagina(
      q,
      this.prisma.almacen.findMany({
        where,
        include: { sucursal: true },
        ...this.paginar(q),
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.almacen.count({ where }),
    );
  }
  async obtenerAlmacen(
    id: number,
    actor: UsuarioAutenticado,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const row = await db.almacen.findUnique({ where: { idAlmacen: id } });
    if (!row) throw new NotFoundException('Almacén no encontrado');
    await this.validarSucursal(row.idSucursal, actor, db, false);
    return row;
  }
  async crearAlmacen(dto: AlmacenDto, actor: UsuarioAutenticado) {
    await this.validarSucursal(dto.idSucursal, actor);
    return this.prisma.almacen.create({ data: dto });
  }
  async actualizarAlmacen(
    id: number,
    dto: Partial<Omit<AlmacenDto, 'idSucursal'>>,
    actor: UsuarioAutenticado,
  ) {
    const row = await this.obtenerAlmacen(id, actor);
    await this.validarSucursal(row.idSucursal, actor);
    return this.prisma.almacen.update({ where: { idAlmacen: id }, data: dto });
  }
  async eliminarAlmacen(id: number, actor: UsuarioAutenticado) {
    const row = await this.obtenerAlmacen(id, actor);
    await this.validarSucursal(row.idSucursal, actor);
    await this.prisma.almacen.delete({ where: { idAlmacen: id } });
    return { message: 'Almacén eliminado' };
  }

  private inventarioWhere(
    q: ListarDto,
    actor: UsuarioAutenticado,
  ): Prisma.InventarioWhereInput {
    return {
      idSucursal: this.sucursales(q, actor),
      idAlmacen: q.idAlmacen,
      idInventario: q.idInventario,
      productoSucursal: {
        idProducto: q.idProducto,
        producto: q.buscar ? { nombre: { contains: q.buscar } } : undefined,
      },
    };
  }
  listarInventarios(q: ListarDto, actor: UsuarioAutenticado) {
    const where = this.inventarioWhere(q, actor);
    return this.pagina(
      q,
      this.prisma.inventario.findMany({
        where,
        include: inventarioInclude,
        ...this.paginar(q),
        orderBy: { idInventario: 'desc' },
      }),
      this.prisma.inventario.count({ where }),
    );
  }
  async obtenerInventario(
    id: number,
    actor: UsuarioAutenticado,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const row = await db.inventario.findUnique({
      where: { idInventario: id },
      include: inventarioInclude,
    });
    if (!row) throw new NotFoundException('Inventario no encontrado');
    await this.validarSucursal(row.idSucursal, actor, db, false);
    return row;
  }
  crearInventario(dto: InventarioDto, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      const productoSucursal = await this.obtenerProductoSucursal(
        dto.idProductoSucursal,
        actor,
        tx,
      );
      const almacen = await this.obtenerAlmacen(dto.idAlmacen, actor, tx);
      if (productoSucursal.idSucursal !== almacen.idSucursal)
        throw new BadRequestException(
          'El producto y el almacén deben pertenecer a la misma sucursal',
        );
      await this.validarSucursal(almacen.idSucursal, actor, tx);
      if (
        !productoSucursal.estado ||
        !productoSucursal.producto.estado ||
        !almacen.estado
      )
        throw new BadRequestException(
          'El producto, su asignación y el almacén deben estar activos',
        );
      const inventario = await tx.inventario.create({
        data: {
          idProductoSucursal: dto.idProductoSucursal,
          idAlmacen: dto.idAlmacen,
          idSucursal: almacen.idSucursal,
          stockMinimo: dto.stockMinimo,
        },
      });
      if (new Prisma.Decimal(dto.stockInicial).gt(0)) {
        await this.aplicarMovimiento(
          tx,
          {
            idInventario: inventario.idInventario,
            idTipoMovimiento: MOVIMIENTO_INICIAL,
            cantidad: dto.stockInicial,
          },
          actor,
        );
      }
      return this.obtenerInventario(inventario.idInventario, actor, tx);
    });
  }
  async actualizarInventario(
    id: number,
    dto: { stockMinimo: string },
    actor: UsuarioAutenticado,
  ) {
    const row = await this.obtenerInventario(id, actor);
    await this.validarSucursal(row.idSucursal, actor);
    return this.prisma.inventario.update({
      where: { idInventario: id },
      data: { stockMinimo: dto.stockMinimo },
    });
  }
  tiposMovimiento() {
    return this.prisma.tipoMovimientoInventario.findMany({
      orderBy: { idTipoMovimiento: 'asc' },
    });
  }
  listarMovimientos(q: ListarDto, actor: UsuarioAutenticado) {
    const where: Prisma.InventarioMovimientoWhereInput = {
      inventario: this.inventarioWhere(q, actor),
      idTipoMovimiento: q.idTipoMovimiento,
      fechaMovimiento: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    return this.pagina(
      q,
      this.prisma.inventarioMovimiento.findMany({
        where,
        include: movimientoInclude,
        ...this.paginar(q),
        orderBy: { idMovimiento: 'desc' },
      }),
      this.prisma.inventarioMovimiento.count({ where }),
    );
  }
  async obtenerMovimiento(id: number, actor: UsuarioAutenticado) {
    const row = await this.prisma.inventarioMovimiento.findUnique({
      where: { idMovimiento: id },
      include: movimientoInclude,
    });
    if (!row) throw new NotFoundException('Movimiento no encontrado');
    await this.validarSucursal(
      row.inventario.idSucursal,
      actor,
      this.prisma,
      false,
    );
    return row;
  }
  crearMovimiento(dto: MovimientoDto, actor: UsuarioAutenticado) {
    return this.prisma.$transaction((tx) =>
      this.aplicarMovimiento(tx, dto, actor),
    );
  }
  private async aplicarMovimiento(
    tx: Prisma.TransactionClient,
    dto: MovimientoDto,
    actor: UsuarioAutenticado,
  ) {
    // La lectura compartida serializa el cambio de política con cada movimiento,
    // mientras permite movimientos simultáneos en almacenes diferentes.
    const [configuracion] = await tx.$queryRaw<
      { activo: boolean | number }[]
    >`SELECT activo FROM configuraciones_globales WHERE nombre = ${CONFIG_STOCK_NEGATIVO} LOCK IN SHARE MODE`;
    if (!configuracion) {
      throw new NotFoundException('Configuración global no encontrada');
    }
    // Bloquea el saldo hasta registrar stock e historial. Dos salidas concurrentes
    // nunca leen el mismo saldo anterior.
    await tx.$queryRaw`SELECT id_inventario FROM inventarios WHERE id_inventario = ${dto.idInventario} FOR UPDATE`;
    const inventario = await this.obtenerInventario(
      dto.idInventario,
      actor,
      tx,
    );
    await this.validarSucursal(inventario.idSucursal, actor, tx);
    if (
      !inventario.almacen.estado ||
      !inventario.productoSucursal.estado ||
      !inventario.productoSucursal.producto.estado
    )
      throw new BadRequestException(
        'El producto, su asignación y el almacén deben estar activos',
      );
    const tipo = await tx.tipoMovimientoInventario.findUnique({
      where: { idTipoMovimiento: dto.idTipoMovimiento },
    });
    if (!tipo)
      throw new BadRequestException('Tipo de movimiento no encontrado');
    if (
      tipo.idTipoMovimiento === MOVIMIENTO_INICIAL &&
      (inventario.stock.gt(0) ||
        (await tx.inventarioMovimiento.count({
          where: { idInventario: dto.idInventario },
        })))
    ) {
      throw new ConflictException(
        'El stock inicial solo se registra antes del primer movimiento',
      );
    }
    const cantidad = new Prisma.Decimal(dto.cantidad);
    if (!cantidad.gt(0) || cantidad.decimalPlaces() > 3)
      throw new BadRequestException('Cantidad inválida');
    const stock =
      tipo.entradaSalida === 'ENTRADA'
        ? inventario.stock.plus(cantidad)
        : inventario.stock.minus(cantidad);
    if (stock.lt(0) && !configuracion.activo)
      throw new ConflictException(
        'Stock insuficiente; el stock negativo está desactivado',
      );
    if (stock.abs().gt('99999999999.999'))
      throw new BadRequestException('El stock supera el máximo permitido');
    await tx.inventario.update({
      where: { idInventario: dto.idInventario },
      data: { stock },
    });
    return tx.inventarioMovimiento.create({
      data: {
        idInventario: dto.idInventario,
        idTipoMovimiento: tipo.idTipoMovimiento,
        idUsuario: actor.idUsuario,
        cantidad,
        stockAnterior: inventario.stock,
        stockResultante: stock,
        observacion: dto.observacion,
      },
      include: { tipoMovimiento: true },
    });
  }
}
