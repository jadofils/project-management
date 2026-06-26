import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { CommentsService } from './comments.service';

@Controller('tasks') @UseGuards(BwengeJwtAuthGuard)
export class CommentsController {
  constructor(private readonly svc: CommentsService) {}

  @Get(':taskId/comments')
  getByTask(@Param('taskId') taskId: string) {
    return this.svc.getByTask(taskId);
  }

  @Post(':taskId/comments')
  create(@Req() req: any, @Param('taskId') taskId: string, @Body() body: { content: string }) {
    return this.svc.create(req.user.sub, taskId, body.content);
  }

  @Delete('comments/:id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
