import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from '../common/dto';

@Controller('tasks')
@UseGuards(BwengeJwtAuthGuard)
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get('project/:id')
  findByProject(@Param('id') id: string) {
    return this.service.findByProject(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
