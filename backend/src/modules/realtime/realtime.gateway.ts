import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { z } from 'zod';
import { JwtStrategy } from '../../common/strategies/jwt.strategy.js';
import { AuthService } from '../auth/auth.service.js';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../auth/auth.constants.js';

export type RecursoRealtime =
  | 'caja'
  | 'ventas'
  | 'ingresos'
  | 'egresos'
  | 'compras'
  | 'deudas'
  | 'stock'
  | 'clientes';
const permisos: Record<RecursoRealtime, string> = {
  caja: 'CAJA_VER',
  ventas: 'VENTAS_VER',
  ingresos: 'CAJA_VER',
  egresos: 'CAJA_VER',
  compras: 'COMPRAS_VER',
  deudas: 'DEUDAS_VER',
  stock: 'LOGISTICA_VER',
  clientes: 'PERSONAS_VER',
};
const accessSchema = z.object({
  sub: z.number().int().positive(),
  tipo: z.literal('access'),
  exp: z.number(),
});
const room = (branch: number, resource: RecursoRealtime) =>
  `sucursal:${branch}:${resource}`;

// Se usa el mismo origen y las mismas cookies HttpOnly que la API.
@WebSocketGateway({ namespace: '/tiempo-real', path: '/socket.io' })
export class RealtimeGateway implements OnGatewayInit, OnModuleDestroy {
  @WebSocketServer() server!: Namespace;
  private readonly logger = new Logger(RealtimeGateway.name);
  private auditTimer?: ReturnType<typeof setInterval>;
  private auditing = false;

  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(JwtStrategy) private readonly strategy: JwtStrategy,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  afterInit(server: Namespace) {
    server.use((socket, next) => {
      void this.authorize(socket).then(
        () => next(),
        () => next(new Error('Sesión o sucursal no autorizada')),
      );
    });
    this.auditTimer = setInterval(() => {
      void this.audit();
    }, 60_000);
    this.auditTimer.unref();
  }

  private async authorize(socket: Socket) {
    const origin = socket.handshake.headers.origin;
    if (origin) {
      const source = new URL(origin),
        target = new URL(`http://${socket.handshake.headers.host}`);
      if (
        !['http:', 'https:'].includes(source.protocol) ||
        source.hostname !== target.hostname ||
        (this.config.get('NODE_ENV') === 'production' &&
          source.host !== target.host)
      )
        throw new Error('Origen inválido');
    }
    const cookies = Object.fromEntries(
      (socket.handshake.headers.cookie ?? '').split(';').map((entry) => {
        const index = entry.indexOf('=');
        return index < 0
          ? ['', '']
          : [
              entry.slice(0, index).trim(),
              decodeURIComponent(entry.slice(index + 1)),
            ];
      }),
    );
    const token = cookies[ACCESS_COOKIE_NAME];
    if (!token) throw new Error('Sin sesión');
    let payload = accessSchema.parse(
      await this.jwt.verifyAsync(token, { ignoreExpiration: true }),
    );
    if (payload.exp <= Date.now() / 1000) {
      const renewed = accessSchema.parse(
        await this.jwt.verifyAsync(
          await this.auth.refresh(cookies[REFRESH_COOKIE_NAME] ?? ''),
        ),
      );
      if (renewed.sub !== payload.sub) throw new Error('Sesión inválida');
      payload = renewed;
    }
    const actor = await this.strategy.validate(payload);
    const branch = z
      .number()
      .int()
      .positive()
      .parse(socket.handshake.auth.idSucursal);
    if (actor.estado !== 'ACTIVO' || !actor.sucursales.includes(branch))
      throw new Error('Sin acceso');
    socket.data.payload = payload;
    socket.data.branch = branch;
    for (const [resource, permission] of Object.entries(permisos)) {
      if (
        actor.rol.nombre === 'SUPERADMIN' ||
        actor.permisos.includes(permission)
      )
        await socket.join(room(branch, resource as RecursoRealtime));
    }
  }

  private async audit() {
    if (this.auditing) return;
    this.auditing = true;
    try {
      // Revalida cambios de estado, permisos y sucursales en sesiones abiertas.
      for (const socket of this.server.sockets.values()) {
        try {
          const payload = accessSchema.parse(socket.data.payload);
          const actor = await this.strategy.validate(payload);
          if (
            payload.exp <= Date.now() / 1000 ||
            actor.estado !== 'ACTIVO' ||
            !actor.sucursales.includes(socket.data.branch)
          ) {
            socket.disconnect(true);
            continue;
          }
          for (const [resource, permission] of Object.entries(permisos)) {
            const name = room(socket.data.branch, resource as RecursoRealtime);
            if (
              actor.rol.nombre === 'SUPERADMIN' ||
              actor.permisos.includes(permission)
            )
              await socket.join(name);
            else await socket.leave(name);
          }
        } catch {
          socket.disconnect(true);
        }
      }
    } finally {
      this.auditing = false;
    }
  }

  notify(idSucursal: number | null, recursos: RecursoRealtime[]) {
    if (!this.server) return;
    try {
      const branches = idSucursal
        ? [idSucursal]
        : [
            ...new Set(
              [...this.server.adapter.rooms.keys()]
                .map((name) => /^sucursal:(\d+):/.exec(name)?.[1])
                .filter(Boolean)
                .map(Number),
            ),
          ];
      for (const branch of branches) {
        this.server
          .to(recursos.map((resource) => room(branch, resource)))
          .emit('datos:actualizados', { idSucursal: branch, recursos });
      }
    } catch (cause) {
      // Un fallo de notificación no convierte una operación confirmada en un error HTTP.
      this.logger.warn(
        `No se pudo notificar un cambio: ${cause instanceof Error ? cause.message : 'error'}`,
      );
    }
  }

  onModuleDestroy() {
    if (this.auditTimer) clearInterval(this.auditTimer);
  }
}
