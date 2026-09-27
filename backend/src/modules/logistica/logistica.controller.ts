import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import type { z } from 'zod';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator.js';
import { SoloSuperadmin } from '../../common/decorators/solo-superadmin.decorator.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import * as D from './dto/logistica.dto.js';
import { LogisticaService } from './logistica.service.js';
import { LogisticaPrismaFilter } from './logistica.filter.js';

@Controller('logistica')
@UseFilters(LogisticaPrismaFilter)
export class LogisticaController {
  constructor(
    @Inject(LogisticaService) private readonly service: LogisticaService,
  ) {}

  @Get('configuraciones-globales')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  configuracionesGlobales() {
    return this.service.configuracionesGlobales();
  }

  @Get('configuraciones-globales/:nombre')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerConfiguracionGlobal(@Param('nombre') nombre: string) {
    return this.service.obtenerConfiguracionGlobal(nombre);
  }

  @Patch('configuraciones-globales/:nombre')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  @SoloSuperadmin()
  actualizarConfiguracionGlobal(
    @Param('nombre') nombre: string,
    @Body(new ZodValidationPipe(D.ActualizarConfiguracionGlobalSchema))
    dto: z.infer<typeof D.ActualizarConfiguracionGlobalSchema>,
  ) {
    return this.service.actualizarConfiguracionGlobal(nombre, dto.activo);
  }

  @Get('tipos-producto')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarTipoProducto(
    @Query(new ZodValidationPipe(D.ListarSchema))
    q: z.infer<typeof D.ListarSchema>,
  ) {
    return this.service.listarTipoProducto(q);
  }
  @Get('tipos-producto/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerTipoProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerTipoProducto(id);
  }
  @Post('tipos-producto')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearTipoProducto(
    @Body(new ZodValidationPipe(D.TipoProductoSchema))
    dto: z.infer<typeof D.TipoProductoSchema>,
  ) {
    return this.service.crearTipoProducto(dto);
  }
  @Patch('tipos-producto/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  actualizarTipoProducto(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarTipoProductoSchema))
    dto: z.infer<typeof D.ActualizarTipoProductoSchema>,
  ) {
    return this.service.actualizarTipoProducto(id, dto);
  }
  @Delete('tipos-producto/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  eliminarTipoProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarTipoProducto(id);
  }

  @Get('categorias')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarCategoria(
    @Query(new ZodValidationPipe(D.ListarSchema))
    q: z.infer<typeof D.ListarSchema>,
  ) {
    return this.service.listarCategoria(q);
  }
  @Get('categorias/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerCategoria(id);
  }
  @Post('categorias')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearCategoria(
    @Body(new ZodValidationPipe(D.CategoriaSchema))
    dto: z.infer<typeof D.CategoriaSchema>,
  ) {
    return this.service.crearCategoria(dto);
  }
  @Patch('categorias/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  actualizarCategoria(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarCategoriaSchema))
    dto: z.infer<typeof D.ActualizarCategoriaSchema>,
  ) {
    return this.service.actualizarCategoria(id, dto);
  }
  @Delete('categorias/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  eliminarCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarCategoria(id);
  }

  @Get('unidades-medida')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarUnidadMedida(
    @Query(new ZodValidationPipe(D.ListarSchema))
    q: z.infer<typeof D.ListarSchema>,
  ) {
    return this.service.listarUnidadMedida(q);
  }
  @Get('unidades-medida/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerUnidadMedida(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerUnidadMedida(id);
  }
  @Post('unidades-medida')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearUnidadMedida(
    @Body(new ZodValidationPipe(D.UnidadMedidaSchema))
    dto: z.infer<typeof D.UnidadMedidaSchema>,
  ) {
    return this.service.crearUnidadMedida(dto);
  }
  @Patch('unidades-medida/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  actualizarUnidadMedida(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarUnidadMedidaSchema))
    dto: z.infer<typeof D.ActualizarUnidadMedidaSchema>,
  ) {
    return this.service.actualizarUnidadMedida(id, dto);
  }
  @Delete('unidades-medida/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  eliminarUnidadMedida(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarUnidadMedida(id);
  }

  @Get('productos')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarProducto(
    @Query(new ZodValidationPipe(D.ListarProductosSchema))
    q: z.infer<typeof D.ListarProductosSchema>,
  ) {
    return this.service.listarProductos(q);
  }
  @Get('productos/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerProducto(id);
  }
  @Post('productos')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearProducto(
    @Body(new ZodValidationPipe(D.ProductoSchema))
    dto: z.infer<typeof D.ProductoSchema>,
  ) {
    return this.service.crearProducto(dto);
  }
  @Patch('productos/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  actualizarProducto(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarProductoSchema))
    dto: z.infer<typeof D.ActualizarProductoSchema>,
  ) {
    return this.service.actualizarProducto(id, dto);
  }
  @Delete('productos/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  eliminarProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarProducto(id);
  }

  @Get('producto-sucursal')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarProductoSucursal(
    @Query(new ZodValidationPipe(D.ListarProductoSucursalSchema))
    q: z.infer<typeof D.ListarProductoSucursalSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.listarProductoSucursal(q, actor);
  }
  @Get('producto-sucursal/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerProductoSucursal(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.obtenerProductoSucursal(id, actor);
  }
  @Post('producto-sucursal')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearProductoSucursal(
    @Body(new ZodValidationPipe(D.ProductoSucursalSchema))
    dto: z.infer<typeof D.ProductoSucursalSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.crearProductoSucursal(dto, actor);
  }
  @Patch('producto-sucursal/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  actualizarProductoSucursal(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarProductoSucursalSchema))
    dto: z.infer<typeof D.ActualizarProductoSucursalSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.actualizarProductoSucursal(id, dto, actor);
  }
  @Delete('producto-sucursal/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  eliminarProductoSucursal(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.eliminarProductoSucursal(id, actor);
  }

  @Get('almacenes')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarAlmacen(
    @Query(new ZodValidationPipe(D.ListarSucursalesSchema))
    q: z.infer<typeof D.ListarSucursalesSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.listarAlmacenes(q, actor);
  }
  @Get('almacenes/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerAlmacen(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.obtenerAlmacen(id, actor);
  }
  @Post('almacenes')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearAlmacen(
    @Body(new ZodValidationPipe(D.AlmacenSchema))
    dto: z.infer<typeof D.AlmacenSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.crearAlmacen(dto, actor);
  }
  @Patch('almacenes/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  actualizarAlmacen(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarAlmacenSchema))
    dto: z.infer<typeof D.ActualizarAlmacenSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.actualizarAlmacen(id, dto, actor);
  }
  @Delete('almacenes/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  eliminarAlmacen(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.eliminarAlmacen(id, actor);
  }

  @Get('inventarios')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarInventarios(
    @Query(new ZodValidationPipe(D.ListarInventariosSchema))
    q: z.infer<typeof D.ListarInventariosSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.listarInventarios(q, actor);
  }
  @Get('inventarios/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerInventario(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.obtenerInventario(id, actor);
  }
  @Post('inventarios')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearInventario(
    @Body(new ZodValidationPipe(D.InventarioSchema))
    dto: z.infer<typeof D.InventarioSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.crearInventario(dto, actor);
  }
  @Patch('inventarios/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  actualizarInventario(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarInventarioSchema))
    dto: z.infer<typeof D.ActualizarInventarioSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.actualizarInventario(id, dto, actor);
  }
  @Get('tipos-movimiento-inventario')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  tiposMovimiento() {
    return this.service.tiposMovimiento();
  }

  @Get('inventario-movimientos')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listarMovimientos(
    @Query(new ZodValidationPipe(D.ListarMovimientosSchema))
    q: z.infer<typeof D.ListarMovimientosSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.listarMovimientos(q, actor);
  }
  @Get('inventario-movimientos/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  obtenerMovimiento(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.obtenerMovimiento(id, actor);
  }
  @Post('inventario-movimientos')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  crearMovimiento(
    @Body(new ZodValidationPipe(D.MovimientoSchema))
    dto: z.infer<typeof D.MovimientoSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.crearMovimiento(dto, actor);
  }
}
