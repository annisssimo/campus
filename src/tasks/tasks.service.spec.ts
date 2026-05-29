import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Task, TaskStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { TasksGateway } from './tasks.gateway';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let tasksService: TasksService;
  let prisma: {
    task: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  const userId = 'user-id';
  const taskId = 'task-id';

  const activeTask: Task = {
    id: taskId,
    title: 'Test task',
    description: null,
    status: TaskStatus.todo,
    userId,
    deletedAt: null,
    createdAt: new Date('2026-05-29T12:00:00.000Z'),
    updatedAt: new Date('2026-05-29T12:00:00.000Z'),
  };

  const archivedTask: Task = {
    ...activeTask,
    deletedAt: new Date('2026-05-28T12:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    const tasksGateway = {
      emitTaskCreated: vi.fn(),
      emitTaskUpdated: vi.fn(),
      emitTaskDeleted: vi.fn(),
      emitTaskStatusChanged: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksGateway, useValue: tasksGateway },
      ],
    }).compile();

    tasksService = module.get(TasksService);
  });

  it('returns paginated active tasks', async () => {
    prisma.task.findMany.mockResolvedValue([activeTask]);
    prisma.task.count.mockResolvedValue(1);

    const result = await tasksService.findAll(userId, {
      page: 1,
      limit: 20,
      archived: false,
    });

    expect(result.data).toEqual([activeTask]);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { userId, deletedAt: null },
      skip: 0,
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('filters by status and archived flag', async () => {
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.count.mockResolvedValue(0);

    await tasksService.findAll(userId, {
      page: 2,
      limit: 10,
      status: TaskStatus.done,
      archived: true,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        deletedAt: { not: null },
        status: TaskStatus.done,
      },
      skip: 10,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('throws NotFoundException when task belongs to another user', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(tasksService.findOne(userId, taskId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when updating archived task', async () => {
    prisma.task.findFirst.mockResolvedValue(archivedTask);

    await expect(
      tasksService.update(userId, taskId, { title: 'Updated' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('soft-deletes a task', async () => {
    prisma.task.findFirst.mockResolvedValue(activeTask);
    prisma.task.update.mockResolvedValue(archivedTask);

    const result = await tasksService.remove(userId, taskId);

    expect(result.deletedAt).not.toBeNull();
    expect(prisma.task.update).toHaveBeenCalledOnce();
    const updateArgs = prisma.task.update.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { deletedAt: Date };
    };
    expect(updateArgs.where).toEqual({ id: taskId });
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
  });
});
