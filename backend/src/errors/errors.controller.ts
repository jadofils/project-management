import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ErrorsService } from './errors.service';

@Controller('errors')
export class ErrorsController {
  constructor(private readonly svc: ErrorsService) {}
  @Post() log(@Body() dto: any) { return this.svc.create(dto); }
  @Get() @UseGuards(JwtAuthGuard) getAll() { return this.svc.findAll(); }
  @Patch(':id/read') @UseGuards(JwtAuthGuard) markRead(@Param('id') id: string) { return this.svc.markRead(id); }
  @Patch('read-all') @UseGuards(JwtAuthGuard) markAllRead() { return this.svc.markAllRead(); }
}
