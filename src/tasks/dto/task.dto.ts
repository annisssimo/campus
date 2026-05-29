import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaginatedMetaDto,
  paginationQuerySchema,
} from '../../common/dto/pagination-query.dto';
import {
  EXAMPLE_ISO_DATE,
  EXAMPLE_UUID,
} from '../../common/swagger/swagger.constants';

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true')
  .optional()
  .default(false);

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(255)
      .meta({ examples: ['Buy groceries'] }),
    description: z
      .string()
      .max(2000)
      .optional()
      .meta({ examples: ['Milk, eggs, bread'] }),
    status: taskStatusSchema.optional().meta({ examples: ['todo'] }),
  })
  .meta({ id: 'CreateTaskRequest' });

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .meta({ examples: ['Buy groceries'] }),
    description: z
      .string()
      .max(2000)
      .nullable()
      .optional()
      .meta({ examples: ['Milk, eggs, bread, butter'] }),
    status: taskStatusSchema.optional().meta({ examples: ['in_progress'] }),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined,
    { message: 'At least one field must be provided' },
  )
  .meta({ id: 'UpdateTaskRequest' });

export const taskQuerySchema = paginationQuerySchema
  .extend({
    status: taskStatusSchema.optional().meta({ examples: ['todo'] }),
    archived: booleanQuerySchema.meta({ examples: [false] }),
  })
  .meta({ id: 'TaskQuery' });

export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class TaskQueryDto extends createZodDto(taskQuerySchema) {}

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;

export class TaskResponseDto {
  @ApiProperty({ example: EXAMPLE_UUID })
  id: string;

  @ApiProperty({ example: 'Buy groceries' })
  title: string;

  @ApiProperty({ example: 'Milk, eggs, bread', nullable: true })
  description: string | null;

  @ApiProperty({ enum: ['todo', 'in_progress', 'done'], example: 'todo' })
  status: z.infer<typeof taskStatusSchema>;

  @ApiProperty({ example: EXAMPLE_UUID })
  userId: string;

  @ApiProperty({ example: null, nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ example: EXAMPLE_ISO_DATE })
  createdAt: Date;

  @ApiProperty({ example: EXAMPLE_ISO_DATE })
  updatedAt: Date;
}

export class PaginatedTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  data: TaskResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;
}
