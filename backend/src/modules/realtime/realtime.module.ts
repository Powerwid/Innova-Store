import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeInterceptor } from './realtime.interceptor.js';

@Module({
  imports: [AuthModule],
  providers: [
    RealtimeGateway,
    { provide: APP_INTERCEPTOR, useClass: RealtimeInterceptor },
  ],
})
export class RealtimeModule {}
