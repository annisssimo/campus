import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginInput, RegisterInput } from './dto/auth.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterInput): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    try {
      const user = await this.usersService.create(dto.email, passwordHash);
      return this.buildAuthResponse(user.id, user.email, user.createdAt);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginInput): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user.id, user.email, user.createdAt);
  }

  private buildAuthResponse(
    id: string,
    email: string,
    createdAt: Date,
  ): AuthResponseDto {
    const payload: JwtPayload = { sub: id, email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id, email, createdAt },
    };
  }
}
