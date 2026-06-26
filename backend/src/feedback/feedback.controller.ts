import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FeedbackService } from './feedback.service';

@Controller('feedback') @UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly svc: FeedbackService) {}
  @Post() create(@Req() req: any, @Body() dto: any) { return this.svc.create(req.user.sub, dto); }
  @Get() getAll(@Query('page') p?: string, @Query('limit') l?: string) { return this.svc.getAll(Number(p)||1, Number(l)||20); }
  @Patch(':id/assign') assign(@Param('id') id: string, @Body('assigned_to') assignedTo: string) { return this.svc.assign(id, assignedTo); }
  @Patch(':id/status') updateStatus(@Param('id') id: string, @Body('status') status: string) { return this.svc.updateStatus(id, status); }
}
