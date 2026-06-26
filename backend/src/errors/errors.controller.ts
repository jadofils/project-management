import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from '../auth/bwenge-jwt.guard';
import { ErrorsService } from './errors.service';
import { LogErrorDto } from '../common/dto';

@Controller('errors')
export class ErrorsController {
  constructor(private readonly service: ErrorsService) {}

  @Post()
  create(@Body() dto: LogErrorDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(BwengeJwtAuthGuard)
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/read')
  @UseGuards(BwengeJwtAuthGuard)
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }

  @Patch('read-all')
  @UseGuards(BwengeJwtAuthGuard)
  markAllRead() {
    return this.service.markAllRead();
  }
}
