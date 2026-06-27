import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private svc: MembersService) {}

  @Get()
  getAll(@Param('projectId') pid: string) {
    return this.svc.getByProject(pid);
  }

  @Post()
  add(@Param('projectId') pid: string, @Body() body: { user_id: string; role: any; roles?: any[]; permission_level?: string }) {
    return this.svc.add(pid, body.user_id, body.role, body.roles, body.permission_level);
  }

  @Post('bulk')
  addBulk(@Param('projectId') pid: string, @Body() body: { user_ids: string[]; role: any; permission_level?: string }) {
    return this.svc.addBulk(pid, body.user_ids, body.role, body.permission_level);
  }

  @Patch(':userId')
  update(
    @Param('projectId') pid: string,
    @Param('userId') uid: string,
    @Body() body: { role?: any; roles?: any[]; permission_level?: string },
  ) {
    return this.svc.updateMember(pid, uid, body);
  }

  @Delete(':userId')
  remove(@Param('projectId') pid: string, @Param('userId') uid: string) {
    return this.svc.remove(pid, uid);
  }
}
