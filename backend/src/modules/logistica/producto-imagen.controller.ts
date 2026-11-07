import {
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';
import { MAX_IMAGE_BYTES } from '../../common/storage/image-storage.js';
import { LogisticaPrismaFilter } from './logistica.filter.js';
import { ProductoImagenService } from './producto-imagen.service.js';

@Controller('logistica/productos')
@UseFilters(LogisticaPrismaFilter)
export class ProductoImagenController {
  constructor(
    @Inject(ProductoImagenService)
    private readonly service: ProductoImagenService,
  ) {}

  @Post(':id/imagen')
  @RequierePermiso(PermisoSistema.LOGISTICA_GESTIONAR)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
    }),
  )
  subir(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.service.subir(id, file);
  }

  @Get(':id/imagen/:archivo')
  @RequierePermiso(PermisoSistema.LOGISTICA_VER)
  async imagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('archivo') archivo: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.service.obtener(id, archivo);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(image.buffer, { type: image.mimeType });
  }
}
