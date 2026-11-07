import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UseFilters,
} from '@nestjs/common';
import { z } from 'zod';
import { RequierePermiso } from '../../../common/decorators/requiere-permiso.decorator.js';
import { UsuarioActual } from '../../../common/decorators/usuario-actual.decorator.js';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { ListarOperacionesSchema } from '../compartido/dto/operaciones-base.dto.js';
import { OperacionesPrismaFilter } from '../compartido/operaciones.filter.js';
import { CrearVentaSchema } from './dto/ventas.dto.js';
import { TicketPdfService } from './ticket-pdf.service.js';
import { VentasService } from './ventas.service.js';

@Controller('ventas')
@UseFilters(OperacionesPrismaFilter)
export class VentasController {
  constructor(
    @Inject(VentasService)
    private readonly ventas: VentasService,
    @Inject(TicketPdfService) private readonly tickets: TicketPdfService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.VENTAS_VER)
  listar(
    @Query(new ZodValidationPipe(ListarOperacionesSchema))
    dto: z.infer<typeof ListarOperacionesSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.ventas.listarVentas(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.VENTAS_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.ventas.obtenerVenta(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.VENTAS_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(CrearVentaSchema))
    dto: z.infer<typeof CrearVentaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.ventas.crearVenta(dto, actor);
  }

  @Get(':id/ticket-pdf')
  @RequierePermiso(PermisoSistema.VENTAS_VER)
  @Header('Cache-Control', 'private, no-store')
  async ticketPdf(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const { buffer, filename } = await this.tickets.generar(id, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
    });
  }
}
