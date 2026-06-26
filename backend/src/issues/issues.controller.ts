import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from '../common/dto';

@Controller('issues')
@UseGuards(BwengeJwtAuthGuard)
export class IssuesController {
  constructor(private readonly service: IssuesService) {}

  @Get('project/:id')
  findByProject(@Param('id') id: string) {
    return this.service.findByProject(id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateIssueDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status);
  }
}
