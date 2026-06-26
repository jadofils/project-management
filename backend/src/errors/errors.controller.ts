import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { ErrorsService } from './errors.service';

@Controller('errors')
export class ErrorsController {
  constructor(private readonly svc: ErrorsService) {}
  @Post() log(@Body() dto: any) { return this.svc.log(dto); }
  @Get() @UseGuards(BwengeJwtAuthGuard) getAll(@Query('page') p?: string, @Query('limit') l?: string) { return this.svc.getAll(Number(p)||1, Number(l)||50); }
  @Patch(':id/read') @UseGuards(BwengeJwtAuthGuard) markRead(@Param('id') id: string) { return this.svc.markRead(id); }
  @Patch('read-all') @UseGuards(BwengeJwtAuthGuard) markAllRead() { return this.svc.markAllRead(); }
}
