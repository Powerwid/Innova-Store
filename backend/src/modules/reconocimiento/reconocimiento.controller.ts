import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator.js';
import { SoloSuperadmin } from '../../common/decorators/solo-superadmin.decorator.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import {
  IdReconocimientoSchema,
  ListarReferenciasSchema,
  ReconocerProductoSchema,
} from './dto/reconocimiento.dto.js';
import type {
  ListarReferenciasDto,
  ReconocerProductoDto,
} from './dto/reconocimiento.dto.js';
import { ReconocimientoService } from './reconocimiento.service.js';

const imagenInterceptor = FileInterceptor('file', {
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 3, fieldSize: 1024 },
});

@Controller('reconocimiento')
export class ReconocimientoController {
  constructor(
    @Inject(ReconocimientoService)
    private readonly service: ReconocimientoService,
  ) {}

  @Get('estado')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  estado(@UsuarioActual() actor: UsuarioAutenticado) {
    return this.service.estado(actor);
  }

  @Post('reindexar')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  @SoloSuperadmin()
  reindexarTodo() {
    return this.service.reindexarTodo();
  }

  @Post('buscar')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  @UseInterceptors(imagenInterceptor)
  buscar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(ReconocerProductoSchema))
    dto: ReconocerProductoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.buscar(file, dto, actor);
  }

  @Get('productos/:idProducto/referencias')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  listar(
    @Param('idProducto', new ZodValidationPipe(IdReconocimientoSchema))
    id: number,
    @Query(new ZodValidationPipe(ListarReferenciasSchema))
    dto: ListarReferenciasDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.listarReferencias(id, dto, actor);
  }

  @Post('productos/:idProducto/referencias')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  @UseInterceptors(imagenInterceptor)
  registrar(
    @Param('idProducto', new ZodValidationPipe(IdReconocimientoSchema))
    id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.registrarReferencia(id, file, actor);
  }

  @Get('referencias/:id/imagen')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  async imagen(
    @Param('id', new ZodValidationPipe(IdReconocimientoSchema)) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.service.obtenerImagen(id, actor);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(image.buffer, { type: image.mimeType });
  }

  @Post('referencias/:id/reintentar')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  reintentar(
    @Param('id', new ZodValidationPipe(IdReconocimientoSchema)) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.reintentarReferencia(id, actor);
  }

  @Delete('referencias/:id')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  retirar(
    @Param('id', new ZodValidationPipe(IdReconocimientoSchema)) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.retirarReferencia(id, actor);
  }

  @Post('productos/:idProducto/reindexar')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  reindexar(
    @Param('idProducto', new ZodValidationPipe(IdReconocimientoSchema))
    id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.service.reindexarProducto(id, actor);
  }
}
