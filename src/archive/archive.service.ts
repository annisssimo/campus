import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TasksGateway } from '../tasks/tasks.gateway';
import { ARCHIVE_CLEANUP_CRON } from './archive.constants';
import { getArchiveRetentionCutoff } from './archive.utils';

export { ARCHIVE_RETENTION_DAYS } from './archive.constants';

@Injectable()
export class ArchiveService implements OnModuleInit {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksGateway: TasksGateway,
  ) {}

  onModuleInit(): void {
    void this.runCleanup('startup');
  }

  @Cron(ARCHIVE_CLEANUP_CRON)
  async handleCleanupCron(): Promise<void> {
    await this.runCleanup('cron');
  }

  private async runCleanup(trigger: 'startup' | 'cron'): Promise<void> {
    const deletedCount = await this.cleanupExpiredArchivedTasks();
    if (deletedCount > 0) {
      this.logger.log(
        `Hard-deleted ${deletedCount} archived task(s) (trigger=${trigger})`,
      );
    }
  }

  async cleanupExpiredArchivedTasks(now: Date = new Date()): Promise<number> {
    const cutoff = getArchiveRetentionCutoff(now);

    const expired = await this.prisma.task.findMany({
      where: {
        deletedAt: { lte: cutoff },
      },
    });

    if (expired.length === 0) {
      return 0;
    }

    await this.prisma.task.deleteMany({
      where: { id: { in: expired.map((task) => task.id) } },
    });

    for (const task of expired) {
      this.emitTaskPurged(task);
    }

    return expired.length;
  }

  private emitTaskPurged(task: Task): void {
    this.tasksGateway.emitTaskPurged(task.userId, {
      id: task.id,
      userId: task.userId,
      deletedAt: task.deletedAt,
    });
  }
}
