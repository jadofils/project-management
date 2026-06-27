import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt.guard';
import { LeaveService } from './leave.service';

@Controller('leave')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private svc: LeaveService) {}

  @Get('types') getTypes() { return this.svc.getTypes(); }
  @Post('types') @UseGuards(AdminGuard) createType(@Body() dto: any) { return this.svc.createType(dto); }
  @Delete('types/:id') @UseGuards(AdminGuard) deleteType(@Param('id') id: string) { return this.svc.deleteType(id); }

  @Get('balances') getBalances(@Req() req: any) { return this.svc.getBalances(req.user.sub); }
  @Get('balances/:userId') @UseGuards(AdminGuard) getUserBalances(@Param('userId') userId: string) { return this.svc.getBalances(userId); }

  @Get('requests') getRequests(@Query('user_id') userId?: string, @Query('status') status?: string) { return this.svc.getRequests(userId, status); }
  @Post('requests') createRequest(@Req() req: any, @Body() dto: any) { return this.svc.createRequest(req.user.sub, dto); }
  @Patch('requests/:id/approve') @UseGuards(AdminGuard) approve(@Param('id') id: string, @Req() req: any) { return this.svc.approve(id, req.user.sub); }
  @Patch('requests/:id/reject') @UseGuards(AdminGuard) reject(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) { return this.svc.reject(id, req.user.sub, reason); }
}
