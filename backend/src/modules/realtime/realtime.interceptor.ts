import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { tap } from 'rxjs';
import { RealtimeGateway, type RecursoRealtime } from './realtime.gateway.js';

const resources: Record<string, RecursoRealtime[]> = {
  cajas: ['caja'],
  ventas: ['ventas', 'caja', 'ingresos', 'stock', 'deudas'],
  ingresos: ['ingresos', 'caja'],
  egresos: ['egresos', 'caja'],
  compras: ['compras', 'egresos', 'caja', 'stock'],
  'deudas-clientes': ['deudas', 'ingresos', 'caja'],
  logistica: ['stock'],
  personas: ['clientes'],
  'medios-pago': ['caja'],
};
function branchOf(result: unknown): number | null {
  if (!result || typeof result !== 'object') return null;
  const object = result as Record<string, unknown>;
  if (typeof object.idSucursal === 'number') return object.idSucursal;
  for (const key of [
    'venta',
    'caja',
    'ingreso',
    'egreso',
    'compra',
    'deuda',
    'inventario',
    'almacen',
    'productoSucursal',
    'ingresoOrigen',
  ]) {
    const branch = branchOf(object[key]);
    if (branch) return branch;
  }
  return null;
}

@Injectable()
export class RealtimeInterceptor implements NestInterceptor {
  constructor(
    @Inject(RealtimeGateway) private readonly gateway: RealtimeGateway,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const resource = request.path.replace(/^\/api\//, '').split('/')[0];
    const changed = resources[resource];
    if (
      !changed ||
      !['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)
    )
      return next.handle();
    // El controlador retorna cuando su transacción ya confirmó. Los errores no emiten.
    return next
      .handle()
      .pipe(tap((result) => this.gateway.notify(branchOf(result), changed)));
  }
}
