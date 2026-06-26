import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProjectsService } from './projects.service';

@Controller('projects') @UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}
  @Get() getAll(@Req() req: any) { return this.svc.getMyProjects(req.user.sub, req.user.system_role); }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.svc.create(req.user.sub, dto); }
  @Get(':id') getOne(@Param('id') id: string) { return this.svc.getOne(id); }
  @Delete(':id') delete(@Req() req: any, @Param('id') id: string) { return this.svc.delete(id, req.user.sub, req.user.system_role); }
}
