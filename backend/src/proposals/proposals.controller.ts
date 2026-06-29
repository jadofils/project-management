import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProposalsService } from './proposals.service';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly svc: ProposalsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: { title: string; description?: string; tags?: string[] }) {
    return this.svc.create(req.user.sub, dto);
  }

  @Get()
  getAll(
    @Req() req: any,
    @Query('page') p?: string,
    @Query('limit') l?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.getAll(req.user.sub, Number(p) || 1, Number(l) || 20, status);
  }

  @Get('changelog')
  getChangelog() { return this.svc.getChangelog(); }

  @Post(':id/vote')
  vote(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { vote: 'for' | 'against'; reason?: string },
  ) {
    return this.svc.vote(id, req.user.sub, body.vote, body.reason);
  }

  @Get(':id/votes')
  getVotes(@Param('id') id: string) { return this.svc.getVotes(id); }

  @Get(':id/comments')
  getComments(@Param('id') id: string) { return this.svc.getComments(id); }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Req() req: any, @Body('content') content: string) {
    return this.svc.addComment(id, req.user.sub, content);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; version_tag?: string },
  ) {
    return this.svc.updateStatus(id, body.status, body.version_tag);
  }
}
