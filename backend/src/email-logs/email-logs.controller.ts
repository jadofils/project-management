import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailLog, ProjectInvitation } from '../database/entities';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('email-logs')
@UseGuards(JwtAuthGuard)
export class EmailLogsController {
  constructor(
    @InjectRepository(EmailLog) private logs: Repository<EmailLog>,
    @InjectRepository(ProjectInvitation) private invitations: Repository<ProjectInvitation>,
  ) {}

  @Get()
  async getAll(
    @Query('type') type?: string,
    @Query('project_id') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const where: any = {};
      if (type) where.type = type;
      if (projectId) where.project_id = projectId;

      const p = Number(page) || 1;
      const l = Number(limit) || 30;
      const [data, total] = await this.logs.findAndCount({
        where,
        order: { created_at: 'DESC' },
        skip: (p - 1) * l,
        take: l,
      });

      return { data, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
    } catch {
      return { data: [], total: 0, page: 1, limit: 30, totalPages: 0 };
    }
  }

  @Get('invitation/:invitationId')
  async getByInvitation(@Param('invitationId') invitationId: string) {
    try {
      return await this.logs.find({
        where: { related_id: invitationId },
        order: { created_at: 'DESC' },
      });
    } catch {
      return [];
    }
  }
}
