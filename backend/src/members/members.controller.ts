import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private svc: MembersService) {}

  @Get()
  getAll(@Param('projectId') pid: string) { return this.svc.getByProject(pid); }

  @Post()
  add(@Param('projectId') pid: string, @Body() body: { user_id: string; role: any }) {
    return this.svc.add(pid, body.user_id, body.role);
  }

  @Patch(':userId')
  updateRole(@Param('projectId') pid: string, @Param('userId') uid: string, @Body() body: { role: any }) {
    return this.svc.updateRole(pid, uid, body.role);
  }

  @Delete(':userId')
  remove(@Param('projectId') pid: string, @Param('userId') uid: string) {
    return this.svc.remove(pid, uid);
  }
}
