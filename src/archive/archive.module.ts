import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { ArchiveService } from './archive.service';

@Module({
  imports: [TasksModule],
  providers: [ArchiveService],
})
export class ArchiveModule {}
