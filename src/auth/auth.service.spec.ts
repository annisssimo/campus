import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

vi.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    create: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
  };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  const mockUser = {
    id: 'user-id',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    createdAt: new Date('2026-05-29T12:00:00.000Z'),
  };

  beforeEach(async () => {
    usersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
    };
    jwtService = { sign: vi.fn().mockReturnValue('jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('registers a user and returns access token', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    usersService.create.mockResolvedValue(mockUser);

    const result = await authService.register({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(usersService.create).toHaveBeenCalledWith(
      'user@example.com',
      'hashed-password',
    );
    expect(result.accessToken).toBe('jwt-token');
    expect(result.user.email).toBe('user@example.com');
  });

  it('throws ConflictException when email already exists', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    usersService.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
      }),
    );

    await expect(
      authService.register({
        email: 'user@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with valid credentials', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authService.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('jwt-token');
  });

  it('throws UnauthorizedException when user is not found', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'user@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when password does not match', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      authService.login({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
