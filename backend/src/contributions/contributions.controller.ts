import { Controller, Get, Param, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ContributionsService } from './contributions.service';

@Controller('contributions')
@UseGuards(JwtAuthGuard)
export class ContributionsController {
  constructor(private svc: ContributionsService) {}

  // My own contributions
  @Get()
  getMyContributions(@Req() req: any, @Query('year') year?: string) {
    return this.svc.getForUser(req.user.sub, year ? parseInt(year) : undefined);
  }

  // Specific user's contributions (admin or PM of shared project)
  @Get('user/:userId')
  async getUserContributions(
    @Param('userId') userId: string,
    @Req() req: any,
    @Query('year') year?: string,
  ) {
    const canView = await this.svc.canViewUser(req.user.sub, userId, req.user.system_role);
    if (!canView) throw new ForbiddenException('Not authorized to view this user\'s contributions');
    return this.svc.getForUser(userId, year ? parseInt(year) : undefined);
  }

  // All member contributions for a project (PM / admin)
  @Get('project/:projectId')
  getProjectContributions(
    @Param('projectId') projectId: string,
    @Query('year') year?: string,
  ) {
    return this.svc.getForProject(projectId, year ? parseInt(year) : undefined);
  }

  // System-wide summary for admin dashboard
  @Get('system/summary')
  async getSystemSummary(@Req() req: any, @Query('year') year?: string) {
    if (req.user.system_role !== 'admin') throw new ForbiddenException('Admins only');
    return this.svc.getSystemSummary(year ? parseInt(year) : undefined);
  }
}
