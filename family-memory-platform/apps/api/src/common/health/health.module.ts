import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** Liveness/readiness for Docker and VPS monitoring */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
