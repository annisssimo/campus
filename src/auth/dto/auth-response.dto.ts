import { ApiProperty } from '@nestjs/swagger';
import {
  EXAMPLE_EMAIL,
  EXAMPLE_ISO_DATE,
  EXAMPLE_JWT,
  EXAMPLE_UUID,
} from '../../common/swagger/swagger.constants';

export class UserResponseDto {
  @ApiProperty({ example: EXAMPLE_UUID })
  id: string;

  @ApiProperty({ example: EXAMPLE_EMAIL })
  email: string;

  @ApiProperty({ example: EXAMPLE_ISO_DATE })
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ example: EXAMPLE_JWT })
  accessToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
