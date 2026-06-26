import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { IssuesService } from './issues.service';

@Controller('issues') @UseGuards(BwengeJwtAuthGuard)
export class IssuesController {
  constructor(private readonly svc: IssuesService) {}
  @Get('project/:pid') getByProject(@Param('pid') pid: string) { return this.svc.getByProject(pid); }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.svc.create(req.user.sub, dto); }
  @Patch(':id') updateStatus(@Param('id') id: string, @Body('status') status: string) { return this.svc.updateStatus(id, status); }
}
