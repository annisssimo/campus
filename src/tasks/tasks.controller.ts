import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ApiTaskErrorResponses } from '../common/swagger/api-error.decorators';
import { SWAGGER_BEARER_AUTH } from '../common/swagger/swagger.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateTaskDto,
  PaginatedTasksResponseDto,
  TaskQueryDto,
  TaskResponseDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks with filter and pagination' })
  @ApiOkResponse({ type: PaginatedTasksResponseDto })
  @ApiTaskErrorResponses()
  findAll(@CurrentUser() user: AuthUser, @Query() query: TaskQueryDto) {
    return this.tasksService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiTaskErrorResponses()
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiTaskErrorResponses()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiTaskErrorResponses({ includeForbidden: true })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a task (soft delete)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto, description: 'Task archived' })
  @ApiTaskErrorResponses()
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.remove(user.id, id);
  }
}
