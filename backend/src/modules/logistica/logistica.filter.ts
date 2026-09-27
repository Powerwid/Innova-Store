import { ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

@Catch(Prisma.PrismaClientKnownRequestError)
export class LogisticaPrismaFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const errores: Record<string, [number, string]> = {
      P2002: [409, 'Ya existe un registro con esos datos'],
      P2003: [
        409,
        'El registro está relacionado con otros datos; verifica las referencias o desactívalo',
      ],
      P2025: [404, 'Registro no encontrado'],
      P2020: [400, 'El valor supera el tamaño permitido'],
      P2034: [
        409,
        'El inventario cambió durante la operación; vuelve a intentarlo',
      ],
    };
    const [statusCode, message] = errores[error.code] ?? [
      500,
      'No se pudo completar la operación de logística',
    ];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, message });
  }
}
