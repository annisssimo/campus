import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export const ARCHIVE_RETENTION_DAYS = 7;

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *')
  async handleCleanupCron(): Promise<void> {
    const deletedCount = await this.cleanupExpiredArchivedTasks();
    this.logger.log(`Hard-deleted ${deletedCount} archived task(s)`);
  }

  async cleanupExpiredArchivedTasks(): Promise<number> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - ARCHIVE_RETENTION_DAYS);

    const result = await this.prisma.task.deleteMany({
      where: {
        deletedAt: { lt: cutoff },
      },
    });

    return result.count;
  }
}
