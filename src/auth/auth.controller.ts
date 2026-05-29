import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_THROTTLE } from '../common/throttler/throttler.constants';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAuthErrorResponses,
  ApiConflictErrorResponse,
  ApiValidationErrorResponse,
} from '../common/swagger/api-error.decorators';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@ApiTags('auth')
@Throttle(AUTH_THROTTLE)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'User registered' })
  @ApiValidationErrorResponse()
  @ApiConflictErrorResponse()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Login successful' })
  @ApiAuthErrorResponses()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
