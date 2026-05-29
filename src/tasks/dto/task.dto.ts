import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../common/dto/pagination-query.dto';

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true')
  .optional()
  .default(false);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  status: taskStatusSchema.optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: taskStatusSchema.optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined,
    { message: 'At least one field must be provided' },
  );

export const taskQuerySchema = paginationQuerySchema.extend({
  status: taskStatusSchema.optional(),
  archived: booleanQuerySchema,
});

export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class TaskQueryDto extends createZodDto(taskQuerySchema) {}

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;

export class TaskResponseDto {
  id: string;
  title: string;
  description: string | null;
  status: z.infer<typeof taskStatusSchema>;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
