import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';
import { PaginatedResponse } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskInput, TaskQuery, UpdateTaskInput } from './dto/task.dto';
import { TasksGateway } from './tasks.gateway';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksGateway: TasksGateway,
  ) {}

  async findAll(
    userId: string,
    query: TaskQuery,
  ): Promise<PaginatedResponse<Task>> {
    const where: Prisma.TaskWhereInput = {
      userId,
      deletedAt: query.archived ? { not: null } : null,
      ...(query.status ? { status: query.status } : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async findOne(userId: string, taskId: string): Promise<Task> {
    return this.findOwnedTask(userId, taskId);
  }

  async create(userId: string, dto: CreateTaskInput): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        userId,
      },
    });
    this.tasksGateway.emitTaskCreated(userId, task);
    return task;
  }

  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskInput,
  ): Promise<Task> {
    const task = await this.findOwnedTask(userId, taskId);

    if (task.deletedAt !== null) {
      throw new ForbiddenException('Cannot update archived task');
    }

    const previousStatus = task.status;
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    this.tasksGateway.emitTaskUpdated(userId, updated);
    if (dto.status !== undefined && dto.status !== previousStatus) {
      this.tasksGateway.emitTaskStatusChanged(userId, updated);
    }

    return updated;
  }

  async remove(userId: string, taskId: string): Promise<Task> {
    const task = await this.findOwnedTask(userId, taskId);

    if (task.deletedAt !== null) {
      return task;
    }

    const archived = await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
    this.tasksGateway.emitTaskDeleted(userId, archived);
    return archived;
  }

  private async findOwnedTask(userId: string, taskId: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }
}
