import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const paginationQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .meta({ examples: [1] }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .meta({ examples: [20] }),
  })
  .meta({ id: 'PaginationQuery' });

export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export class PaginatedMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}
