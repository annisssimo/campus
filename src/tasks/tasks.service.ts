import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';
import { PaginatedResponse } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskInput, TaskQuery, UpdateTaskInput } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(userId: string, dto: CreateTaskInput): Promise<Task> {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        userId,
      },
    });
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

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(userId: string, taskId: string): Promise<Task> {
    await this.findOwnedTask(userId, taskId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
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
