import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

// Use flat explicit paths to avoid NestJS parameterized-base routing issues
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class SubtasksController {
  constructor(private service: SubtasksService) {}

  @Get(':taskId/subtasks')
  getAll(@Param('taskId') taskId: string) {
    return this.service.getAll(taskId);
  }

  @Post(':taskId/subtasks')
  create(@Param('taskId') taskId: string, @Body() dto: { title: string }) {
    return this.service.create(taskId, dto);
  }

  @Post(':taskId/subtasks/reorder')
  reorder(
    @Param('taskId') _taskId: string,
    @Body() dto: { orders: { id: string; sort_order: number }[] },
  ) {
    return this.service.reorder(dto.orders);
  }

  @Patch(':taskId/subtasks/:id')
  update(
    @Param('id') id: string,
    @Body() dto: { title?: string; completed?: boolean },
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Delete(':taskId/subtasks/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
