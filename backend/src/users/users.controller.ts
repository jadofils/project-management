import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.sub, req.user.system_role === 'admin');
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id')
  @UseGuards(AdminGuard)
  deactivate(@Param('id') id: string) { return this.svc.deactivate(id); }

  @Delete(':id/permanent')
  @UseGuards(AdminGuard)
  permanentDelete(@Param('id') id: string) { return this.svc.permanentDelete(id); }
}
