import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt.guard';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private svc: AttendanceService) {}

  @Get('token')
  @UseGuards(JwtAuthGuard)
  generateToken(@Req() req: any) { return this.svc.generateToken(req.user.sub); }

  @Post('scan')
  @UseGuards(JwtAuthGuard)
  scan(@Body() body: { token: string; hash: string; scanner_ip?: string; office_id?: string; lat?: number; lng?: number }) {
    return this.svc.scanToken(body.token, body.hash, body.scanner_ip, body.office_id, body.lat, body.lng);
  }

  @Get('today')
  @UseGuards(JwtAuthGuard)
  getToday() { return this.svc.getToday(); }

  @Get('records')
  @UseGuards(JwtAuthGuard)
  getRecords(
    @Query('user_id') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) { return this.svc.getRecords(userId, from, to, Number(page) || 1, Number(limit) || 30); }

  @Get('offices')
  @UseGuards(JwtAuthGuard)
  getOffices() { return this.svc.getOffices(); }

  @Post('offices') @UseGuards(AdminGuard)
  createOffice(@Body() dto: any) { return this.svc.createOffice(dto); }

  // ── IVR Phone Call (public — no JWT, called by Twilio/Africa's Talking) ──
  @Post('ivr')
  async handleIvr(@Body() body: { callerId?: string; From?: string; Digits?: string }) {
    return this.svc.handleIvrCall(body.From || body.callerId || '', body.Digits || '');
  }

  @Get('ivr')
  handleIvrGet(@Query('From') from?: string, @Query('Digits') digits?: string) {
    return this.svc.handleIvrCall(from || '', digits || '');
  }
}
