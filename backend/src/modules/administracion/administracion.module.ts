import { Module } from '@nestjs/common';
import { MediosPagoController } from './medios-pago/medios-pago.controller.js';
import { MediosPagoService } from './medios-pago/medios-pago.service.js';

@Module({ controllers: [MediosPagoController], providers: [MediosPagoService] })
export class AdministracionModule {}
