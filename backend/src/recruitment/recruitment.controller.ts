import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt.guard';
import { RecruitmentService } from './recruitment.service';

@Controller('recruitment')
@UseGuards(JwtAuthGuard)
export class RecruitmentController {
  constructor(private svc: RecruitmentService) {}

  @Get('postings') getPostings(@Query('status') status?: string) { return this.svc.getPostings(status); }
  @Post('postings') @UseGuards(AdminGuard) createPosting(@Req() req: any, @Body() dto: any) { return this.svc.createPosting(dto, req.user.sub); }
  @Patch('postings/:id') @UseGuards(AdminGuard) updatePosting(@Param('id') id: string, @Body() dto: any) { return this.svc.updatePosting(id, dto); }
  @Delete('postings/:id') @UseGuards(AdminGuard) deletePosting(@Param('id') id: string) { return this.svc.deletePosting(id); }

  @Get('applications') getApplications(@Query('posting_id') pid?: string, @Query('status') status?: string) { return this.svc.getApplications(pid, status); }
  @Post('applications') createApplication(@Body() dto: any) { return this.svc.createApplication(dto); }
  @Patch('applications/:id') @UseGuards(AdminGuard) updateApplication(@Param('id') id: string, @Body() dto: any) { return this.svc.updateApplication(id, dto); }
  @Delete('applications/:id') @UseGuards(AdminGuard) deleteApplication(@Param('id') id: string) { return this.svc.deleteApplication(id); }
}
