import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { RequierePermiso } from '../../../common/decorators/requiere-permiso.decorator.js';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { MedioPagoSchema } from './dto/medio-pago.dto.js';
import type { MedioPagoDto } from './dto/medio-pago.dto.js';
import { MediosPagoService } from './medios-pago.service.js';

@Controller('medios-pago')
export class MediosPagoController {
  constructor(private readonly mediosPago: MediosPagoService) {}

  @Get()
  @RequierePermiso(PermisoSistema.MEDIOS_PAGO_VER)
  listar() {
    return this.mediosPago.listar();
  }

  @Post()
  @RequierePermiso(PermisoSistema.MEDIOS_PAGO_GESTIONAR)
  crear(@Body(new ZodValidationPipe(MedioPagoSchema)) dto: MedioPagoDto) {
    return this.mediosPago.crear(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.MEDIOS_PAGO_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(MedioPagoSchema)) dto: MedioPagoDto,
  ) {
    return this.mediosPago.actualizar(id, dto);
  }

  @Delete(':id')
  @RequierePermiso(PermisoSistema.MEDIOS_PAGO_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.mediosPago.eliminar(id);
  }
}
