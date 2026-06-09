import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MinioStorageService } from '../storage/minio-storage.service';
import { DeepHealthService } from './deep-health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly minio: MinioStorageService,
    private readonly deepHealth: DeepHealthService,
  ) {}

  @Get()
  check() {
    return { status: 'ok', service: 'family-api', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  ready() {
    return this.deepHealth.checkAll();
  }

  @Get('deep')
  deep() {
    return this.deepHealth.checkAll();
  }

  @Get('minio')
  async minioHealth() {
    return this.minio.checkHealth();
  }
}
