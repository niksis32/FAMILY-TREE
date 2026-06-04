import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly minio: MinioStorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  check() {
    return { status: 'ok', service: 'family-api', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const [database, minio] = await Promise.all([this.checkDatabase(), this.minio.checkHealth()]);
    const ok = database.ok && minio.ok;

    return {
      status: ok ? 'ok' : 'degraded',
      service: 'family-api',
      timestamp: new Date().toISOString(),
      checks: { database, minio },
    };
  }

  @Get('minio')
  async minioHealth() {
    return this.minio.checkHealth();
  }

  private async checkDatabase(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Database unreachable' };
    }
  }
}
