import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly svc: ProjectsService,
    private readonly users: UsersService,
  ) {}

  @Get('stats')
  getStats() { return this.svc.getAdminStats(); }

  @Post('reset-passwords')
  resetPasswords() { return this.users.resetAllPasswords(); }
}
