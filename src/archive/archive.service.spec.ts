import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { ARCHIVE_RETENTION_DAYS, ArchiveService } from './archive.service';

describe('ArchiveService', () => {
  let archiveService: ArchiveService;
  let prisma: {
    task: {
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));

    prisma = {
      task: {
        deleteMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ArchiveService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    archiveService = module.get(ArchiveService);
  });

  it('hard-deletes tasks archived before retention cutoff', async () => {
    prisma.task.deleteMany.mockResolvedValue({ count: 3 });

    const deletedCount = await archiveService.cleanupExpiredArchivedTasks();

    expect(deletedCount).toBe(3);

    const cutoff = new Date('2026-05-29T12:00:00.000Z');
    cutoff.setUTCDate(cutoff.getUTCDate() - ARCHIVE_RETENTION_DAYS);

    expect(prisma.task.deleteMany).toHaveBeenCalledWith({
      where: {
        deletedAt: { lt: cutoff },
      },
    });
  });

  it('returns zero when no tasks match cutoff', async () => {
    prisma.task.deleteMany.mockResolvedValue({ count: 0 });

    const deletedCount = await archiveService.cleanupExpiredArchivedTasks();

    expect(deletedCount).toBe(0);
  });
});
