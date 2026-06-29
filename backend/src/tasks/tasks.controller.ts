import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TasksService } from './tasks.service';

@Controller('tasks') @UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly svc: TasksService) {}
  @Get('project/:pid') getByProject(@Param('pid') pid: string) { return this.svc.getByProject(pid); }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.svc.create(req.user.sub, { ...dto, created_by: req.user.sub }); }
  @Post('reorder') reorder(@Body() body: { orders: { id: string; sort_order: number; status: string }[] }) { return this.svc.reorder(body.orders); }
  @Patch(':id') update(@Param('id') id: string, @Req() req: any, @Body() dto: any) { return this.svc.update(id, { ...dto, _actor_id: req.user.sub }); }
  @Delete(':id') delete(@Param('id') id: string) { return this.svc.delete(id); }
  @Patch(':id/like') toggleLike(@Param('id') id: string, @Req() req: any) { return this.svc.toggleLike(id, req.user.sub); }
  @Post(':id/images') addImages(@Param('id') id: string, @Body() body: { images: string[] }) { return this.svc.addImages(id, body.images); }
  @Delete(':id/images') removeImage(@Param('id') id: string, @Body() body: { url: string }) { return this.svc.removeImage(id, body.url); }
}
