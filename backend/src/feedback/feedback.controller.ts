import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from '../common/dto';

@Controller('feedback')
@UseGuards(BwengeJwtAuthGuard)
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() body: { assigned_to: string }) {
    return this.service.assign(id, body.assigned_to);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status);
  }
}
