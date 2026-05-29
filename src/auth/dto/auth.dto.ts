import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  EXAMPLE_EMAIL,
  EXAMPLE_PASSWORD,
} from '../../common/swagger/swagger.constants';

export const registerSchema = z
  .object({
    email: z.email().meta({ examples: [EXAMPLE_EMAIL] }),
    password: z
      .string()
      .min(8)
      .meta({ examples: [EXAMPLE_PASSWORD] }),
  })
  .meta({ id: 'RegisterRequest' });

export const loginSchema = z
  .object({
    email: z.email().meta({ examples: [EXAMPLE_EMAIL] }),
    password: z
      .string()
      .min(8)
      .meta({ examples: [EXAMPLE_PASSWORD] }),
  })
  .meta({ id: 'LoginRequest' });

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
