import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { ExecutionContext } from '@nestjs/common';
import { RealtimeInterceptor } from './realtime.interceptor.js';
import type { RealtimeGateway } from './realtime.gateway.js';

function context(path: string, method = 'POST') {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ path, method }) }),
  } as unknown as ExecutionContext;
}
describe('Notificaciones de operaciones confirmadas', () => {
  it('avisa solamente a la sucursal de la venta al completar la operación', async () => {
    const notify = vi.fn(),
      interceptor = new RealtimeInterceptor({
        notify,
      } as unknown as RealtimeGateway);
    const result = { venta: { idSucursal: 7, monto: '12.00' } };
    expect(
      await firstValueFrom(
        interceptor.intercept(context('/api/ventas'), {
          handle: () => of(result),
        }),
      ),
    ).toEqual(result);
    expect(notify).toHaveBeenCalledWith(7, [
      'ventas',
      'caja',
      'ingresos',
      'stock',
      'deudas',
    ]);
  });
  it('no avisa por errores ni por consultas de lectura', async () => {
    const notify = vi.fn(),
      interceptor = new RealtimeInterceptor({
        notify,
      } as unknown as RealtimeGateway);
    await expect(
      firstValueFrom(
        interceptor.intercept(context('/api/ventas'), {
          handle: () => throwError(() => new Error('Stock insuficiente')),
        }),
      ),
    ).rejects.toThrow('Stock insuficiente');
    await firstValueFrom(
      interceptor.intercept(context('/api/ventas', 'GET'), {
        handle: () => of([]),
      }),
    );
    expect(notify).not.toHaveBeenCalled();
  });
  it('propaga cambios de catálogos compartidos a las sucursales suscritas', async () => {
    const notify = vi.fn(),
      interceptor = new RealtimeInterceptor({
        notify,
      } as unknown as RealtimeGateway);
    await firstValueFrom(
      interceptor.intercept(context('/api/logistica/productos/5', 'PATCH'), {
        handle: () => of({ idProducto: 5 }),
      }),
    );
    expect(notify).toHaveBeenCalledWith(null, ['stock']);
  });
});
