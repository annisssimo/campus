import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthResponseDto } from '../src/auth/dto/auth-response.dto';
import { AppModule } from '../src/app.module';
import {
  PaginatedTasksResponseDto,
  TaskResponseDto,
} from '../src/tasks/dto/task.dto';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tasks flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndLogin(
    email: string,
  ): Promise<{ token: string; userId: string }> {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const { accessToken, user } = registerResponse.body as AuthResponseDto;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const loginBody = loginResponse.body as AuthResponseDto;
    expect(loginBody.accessToken).toBeDefined();

    return { token: accessToken, userId: user.id };
  }

  it('register → login → CRUD → archive blocks update', async () => {
    const { token } = await registerAndLogin('flow@example.com');

    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'E2E task', description: 'Test flow' })
      .expect(201);

    const created = createResponse.body as TaskResponseDto;
    expect(created.status).toBe(TaskStatus.todo);
    expect(created.deletedAt).toBeNull();

    const listResponse = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listBody = listResponse.body as PaginatedTasksResponseDto;
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]?.id).toBe(created.id);
    expect(listBody.meta).toEqual({ page: 1, limit: 20, total: 1 });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/tasks/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: TaskStatus.in_progress })
      .expect(200);

    const updated = updateResponse.body as TaskResponseDto;
    expect(updated.status).toBe(TaskStatus.in_progress);

    const archiveResponse = await request(app.getHttpServer())
      .delete(`/tasks/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const archived = archiveResponse.body as TaskResponseDto;
    expect(archived.deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/tasks/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Should fail' })
      .expect(403);

    const secondArchiveResponse = await request(app.getHttpServer())
      .delete(`/tasks/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const secondArchive = secondArchiveResponse.body as TaskResponseDto;
    expect(secondArchive.deletedAt).toBe(archived.deletedAt);
  });

  it('returns 404 when accessing another user task', async () => {
    const userA = await registerAndLogin('usera@example.com');
    const userB = await registerAndLogin('userb@example.com');

    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ title: 'Private task' })
      .expect(201);

    const task = createResponse.body as TaskResponseDto;

    await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ title: 'Hijack' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(404);
  });

  it('filters by status and returns pagination meta', async () => {
    const { token } = await registerAndLogin('filter@example.com');

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Todo 1', status: TaskStatus.todo })
      .expect(201);

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Done 1', status: TaskStatus.done })
      .expect(201);

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Done 2', status: TaskStatus.done })
      .expect(201);

    const filteredResponse = await request(app.getHttpServer())
      .get('/tasks')
      .query({ status: TaskStatus.done, page: 1, limit: 1 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const filtered = filteredResponse.body as PaginatedTasksResponseDto;
    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0]?.status).toBe(TaskStatus.done);
    expect(filtered.meta).toEqual({ page: 1, limit: 1, total: 2 });

    const archivedResponse = await request(app.getHttpServer())
      .get('/tasks')
      .query({ archived: true })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const archivedList = archivedResponse.body as PaginatedTasksResponseDto;
    expect(archivedList.data).toHaveLength(0);
    expect(archivedList.meta.total).toBe(0);
  });
});
