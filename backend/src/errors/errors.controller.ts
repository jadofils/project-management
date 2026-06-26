import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { ErrorsService } from './errors.service';

@Controller('errors')
export class ErrorsController {
  constructor(private readonly svc: ErrorsService) {}
  @Post() log(@Body() dto: any) { return this.svc.create(dto); }
  @Get() @UseGuards(BwengeJwtAuthGuard) getAll() { return this.svc.findAll(); }
  @Patch(':id/read') @UseGuards(BwengeJwtAuthGuard) markRead(@Param('id') id: string) { return this.svc.markRead(id); }
  @Patch('read-all') @UseGuards(BwengeJwtAuthGuard) markAllRead() { return this.svc.markAllRead(); }
}
