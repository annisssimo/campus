import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DEFAULT_THROTTLE } from './common/throttler/throttler.constants';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArchiveModule } from './archive/archive.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([DEFAULT_THROTTLE.default]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TasksModule,
    ArchiveModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
