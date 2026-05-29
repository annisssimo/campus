import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasksController } from './tasks.controller';
import { TasksGateway } from './tasks.gateway';
import { TasksService } from './tasks.service';

@Module({
  imports: [AuthModule],
  controllers: [TasksController],
  providers: [TasksService, TasksGateway],
  exports: [TasksService],
})
export class TasksModule {}
