import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ARCHIVE_RETENTION_DAYS } from '../src/archive/archive.constants';
import { ArchiveService } from '../src/archive/archive.service';
import { getArchiveRetentionCutoff } from '../src/archive/archive.utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Archive purge (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let archiveService: ArchiveService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    archiveService = app.get(ArchiveService);
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('hard-deletes archived tasks after retention period', async () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const retainedDeletedAt = new Date(getArchiveRetentionCutoff(now));
    retainedDeletedAt.setUTCSeconds(retainedDeletedAt.getUTCSeconds() + 1);

    const expiredDeletedAt = new Date(getArchiveRetentionCutoff(now));
    expiredDeletedAt.setUTCDate(
      expiredDeletedAt.getUTCDate() - ARCHIVE_RETENTION_DAYS,
    );

    const user = await prisma.user.create({
      data: {
        email: 'archive-purge@example.com',
        passwordHash: 'hash',
      },
    });

    const retained = await prisma.task.create({
      data: {
        title: 'Still in archive',
        userId: user.id,
        deletedAt: retainedDeletedAt,
      },
    });

    const expired = await prisma.task.create({
      data: {
        title: 'Should be purged',
        userId: user.id,
        deletedAt: expiredDeletedAt,
      },
    });

    const deletedCount = await archiveService.cleanupExpiredArchivedTasks(now);

    expect(deletedCount).toBe(1);

    const remaining = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { title: 'asc' },
    });

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(retained.id);
    expect(
      await prisma.task.findUnique({ where: { id: expired.id } }),
    ).toBeNull();
  });
});
