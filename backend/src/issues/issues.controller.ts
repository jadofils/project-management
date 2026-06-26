import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { IssuesService } from './issues.service';

@Controller('issues') @UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly svc: IssuesService) {}
  @Get('project/:pid') getByProject(@Param('pid') pid: string) { return this.svc.findByProject(pid); }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.svc.create(dto, req.user.sub); }
  @Patch(':id') updateStatus(@Param('id') id: string, @Body('status') status: string) { return this.svc.updateStatus(id, status); }
}
