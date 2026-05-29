import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { TasksGateway } from '../tasks/tasks.gateway';
import { ArchiveService } from './archive.service';
import { getArchiveRetentionCutoff } from './archive.utils';

describe('ArchiveService', () => {
  let archiveService: ArchiveService;
  let prisma: {
    task: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };
  let tasksGateway: {
    emitTaskPurged: ReturnType<typeof vi.fn>;
  };

  const now = new Date('2026-05-29T12:00:00.000Z');
  const expiredTask = {
    id: 'task-1',
    userId: 'user-1',
    deletedAt: new Date('2026-05-20T12:00:00.000Z'),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prisma = {
      task: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    tasksGateway = {
      emitTaskPurged: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksGateway, useValue: tasksGateway },
      ],
    }).compile();

    archiveService = module.get(ArchiveService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hard-deletes tasks at or past retention cutoff and emits purge events', async () => {
    prisma.task.findMany.mockResolvedValue([expiredTask]);
    prisma.task.deleteMany.mockResolvedValue({ count: 1 });

    const deletedCount = await archiveService.cleanupExpiredArchivedTasks(now);

    expect(deletedCount).toBe(1);

    const cutoff = getArchiveRetentionCutoff(now);
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { deletedAt: { lte: cutoff } },
      select: { id: true, userId: true, deletedAt: true },
    });
    expect(prisma.task.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [expiredTask.id] } },
    });
    expect(tasksGateway.emitTaskPurged).toHaveBeenCalledWith(
      expiredTask.userId,
      {
        id: expiredTask.id,
        userId: expiredTask.userId,
        deletedAt: expiredTask.deletedAt,
      },
    );
  });

  it('returns zero when no tasks match cutoff', async () => {
    prisma.task.findMany.mockResolvedValue([]);

    const deletedCount = await archiveService.cleanupExpiredArchivedTasks(now);

    expect(deletedCount).toBe(0);
    expect(prisma.task.deleteMany).not.toHaveBeenCalled();
    expect(tasksGateway.emitTaskPurged).not.toHaveBeenCalled();
  });
});
