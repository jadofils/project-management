import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { StatsService } from './stats.service';
import { ProjectMember } from '../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('projects/:projectId/stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private svc: StatsService,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
  ) {}

  @Get()
  async get(@Param('projectId') projectId: string, @Req() req: any) {
    const userId     = req.user.sub;
    const systemRole = req.user.system_role;

    // Determine if requester is a manager for this project
    let isManager = systemRole === 'admin';
    if (!isManager) {
      const member = await this.members.findOne({ where: { project_id: projectId, user_id: userId } });
      if (member) {
        const roles = member.roles?.length ? member.roles : [member.role];
        isManager = roles.includes('project_manager') || member.permission_level === 'manager';
      }
    }

    return this.svc.getProjectStats(projectId, userId, isManager);
  }
}
