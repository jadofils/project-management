import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { TasksService } from './tasks.service';

@Controller('tasks') @UseGuards(BwengeJwtAuthGuard)
export class TasksController {
  constructor(private readonly svc: TasksService) {}
  @Get('project/:pid') getByProject(@Param('pid') pid: string) { return this.svc.getByProject(pid); }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.svc.create(req.user.sub, dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
  @Delete(':id') delete(@Param('id') id: string) { return this.svc.delete(id); }
}
