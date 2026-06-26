import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('projects/:projectId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private svc: MessagesService) {}

  @Get()
  getAll(@Param('projectId') pid: string) { return this.svc.getByProject(pid); }

  @Post()
  create(@Param('projectId') pid: string, @Req() req: any, @Body() body: { content: string }) {
    return this.svc.create(pid, req.user.sub, body.content);
  }
}
