import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('projects/:projectId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private svc: MessagesService) {}

  @Get()
  getAll(@Param('projectId') pid: string) {
    return this.svc.getByProject(pid);
  }

  @Post()
  create(@Param('projectId') pid: string, @Req() req: any, @Body() body: {
    content: string;
    type?: string;
    file_url?: string;
    file_name?: string;
    reply_to_id?: string;
    task_id?: string;
  }) {
    return this.svc.create(pid, req.user.sub, body.content, {
      type: body.type,
      file_url: body.file_url,
      file_name: body.file_name,
      reply_to_id: body.reply_to_id,
      task_id: body.task_id,
    });
  }
}
