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
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import * as D from './dto/operaciones.dto.js';
import { OperacionesPrismaFilter } from './operaciones.filter.js';
import { OperacionesService } from './operaciones.service.js';

@Controller('cajas')
@UseFilters(OperacionesPrismaFilter)
export class CajasController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarCajasSchema))
    dto: z.infer<typeof D.ListarCajasSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.listarCajas(dto, actor);
  }

  @Get('abierta')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  abierta(
    @Query(new ZodValidationPipe(D.CajaAbiertaQuerySchema))
    dto: z.infer<typeof D.CajaAbiertaQuerySchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.obtenerCajaAbiertaSucursal(dto.idSucursal, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.obtenerCaja(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  abrir(
    @Body(new ZodValidationPipe(D.AbrirCajaSchema))
    dto: z.infer<typeof D.AbrirCajaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.abrirCaja(dto, actor);
  }

  @Patch(':id/cerrar')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.CerrarCajaSchema))
    dto: z.infer<typeof D.CerrarCajaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.cerrarCaja(id, dto, actor);
  }
}

@Controller('motivos-ingreso')
@UseFilters(OperacionesPrismaFilter)
export class MotivosIngresoController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarCatalogosSchema))
    dto: z.infer<typeof D.ListarCatalogosSchema>,
  ) {
    return this.operaciones.listarMotivosIngreso(dto);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.operaciones.obtenerMotivoIngreso(id);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(D.MotivoIngresoSchema))
    dto: z.infer<typeof D.MotivoIngresoSchema>,
  ) {
    return this.operaciones.crearMotivoIngreso(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarMotivoIngresoSchema))
    dto: z.infer<typeof D.ActualizarMotivoIngresoSchema>,
  ) {
    return this.operaciones.actualizarMotivoIngreso(id, dto);
  }

  @Delete(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.operaciones.eliminarMotivoIngreso(id);
  }
}

@Controller('motivos-egreso')
@UseFilters(OperacionesPrismaFilter)
export class MotivosEgresoController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarCatalogosSchema))
    dto: z.infer<typeof D.ListarCatalogosSchema>,
  ) {
    return this.operaciones.listarMotivosEgreso(dto);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.operaciones.obtenerMotivoEgreso(id);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(D.MotivoEgresoSchema))
    dto: z.infer<typeof D.MotivoEgresoSchema>,
  ) {
    return this.operaciones.crearMotivoEgreso(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarMotivoEgresoSchema))
    dto: z.infer<typeof D.ActualizarMotivoEgresoSchema>,
  ) {
    return this.operaciones.actualizarMotivoEgreso(id, dto);
  }

  @Delete(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.operaciones.eliminarMotivoEgreso(id);
  }
}

@Controller('tipos-comprobante')
@UseFilters(OperacionesPrismaFilter)
export class TiposComprobanteController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarTiposComprobanteSchema))
    dto: z.infer<typeof D.ListarTiposComprobanteSchema>,
  ) {
    return this.operaciones.listarTiposComprobante(dto);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.operaciones.obtenerTipoComprobante(id);
  }

  @Post()
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(D.TipoComprobanteSchema))
    dto: z.infer<typeof D.TipoComprobanteSchema>,
  ) {
    return this.operaciones.crearTipoComprobante(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.ActualizarTipoComprobanteSchema))
    dto: z.infer<typeof D.ActualizarTipoComprobanteSchema>,
  ) {
    return this.operaciones.actualizarTipoComprobante(id, dto);
  }

  @Delete(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.operaciones.eliminarTipoComprobante(id);
  }
}

@Controller('ingresos')
@UseFilters(OperacionesPrismaFilter)
export class IngresosController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarIngresosSchema))
    dto: z.infer<typeof D.ListarIngresosSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.listarIngresos(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.obtenerIngreso(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(D.CrearIngresoSchema))
    dto: z.infer<typeof D.CrearIngresoSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.crearIngreso(dto, actor);
  }
}

@Controller('egresos')
@UseFilters(OperacionesPrismaFilter)
export class EgresosController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarEgresosSchema))
    dto: z.infer<typeof D.ListarEgresosSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.listarEgresos(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.obtenerEgreso(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(D.CrearEgresoSchema))
    dto: z.infer<typeof D.CrearEgresoSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.crearEgreso(dto, actor);
  }
}

@Controller('ventas')
@UseFilters(OperacionesPrismaFilter)
export class VentasController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.VENTAS_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarOperacionesSchema))
    dto: z.infer<typeof D.ListarOperacionesSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.listarVentas(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.VENTAS_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.obtenerVenta(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.VENTAS_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(D.CrearVentaSchema))
    dto: z.infer<typeof D.CrearVentaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.crearVenta(dto, actor);
  }
}

@Controller('compras')
@UseFilters(OperacionesPrismaFilter)
export class ComprasController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarComprasSchema))
    dto: z.infer<typeof D.ListarComprasSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.listarCompras(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.obtenerCompra(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(D.CrearCompraSchema))
    dto: z.infer<typeof D.CrearCompraSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.crearCompra(dto, actor);
  }

  @Post(':id/pagos')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.PagoCompraSchema))
    dto: z.infer<typeof D.PagoCompraSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.registrarPagoCompra(id, dto, actor);
  }

  @Post(':id/percepciones')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  registrarPercepcion(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.CrearPercepcionSchema))
    dto: z.infer<typeof D.CrearPercepcionSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.registrarPercepcionCompra(id, dto, actor);
  }
}

@Controller('deudas-clientes')
@UseFilters(OperacionesPrismaFilter)
export class DeudasClientesController {
  constructor(
    @Inject(OperacionesService)
    private readonly operaciones: OperacionesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.DEUDAS_VER)
  listar(
    @Query(new ZodValidationPipe(D.ListarDeudasSchema))
    dto: z.infer<typeof D.ListarDeudasSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.listarDeudasClientes(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.DEUDAS_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.obtenerDeudaCliente(id, actor);
  }

  @Post(':id/abonos')
  @RequierePermiso(PermisoSistema.DEUDAS_GESTIONAR)
  abonar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(D.CrearAbonoDeudaSchema))
    dto: z.infer<typeof D.CrearAbonoDeudaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.operaciones.crearAbonoDeuda(id, dto, actor);
  }
}
