import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_ADAPTER, StorageAdapter } from '../storage/storage.port';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  @Get('live')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.storage.ensureWritable();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Service dependencies are unavailable');
    }
  }
}
