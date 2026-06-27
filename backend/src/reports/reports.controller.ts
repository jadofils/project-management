import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('attendance')
  async attendance(@Res() res: Response, @Query('user_id') uid?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const { csv, filename } = await this.svc.attendanceReport(uid, from, to);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${filename}"` });
    res.send(csv);
  }

  @Get('leave')
  async leave(@Res() res: Response, @Query('year') year?: string) {
    const { csv, filename } = await this.svc.leaveReport(Number(year) || undefined);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${filename}"` });
    res.send(csv);
  }

  @Get('headcount')
  async headcount(@Res() res: Response) {
    const { csv, filename } = await this.svc.headcountReport();
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${filename}"` });
    res.send(csv);
  }

  @Get('tasks')
  async tasks(@Res() res: Response, @Query('project_id') pid?: string) {
    const { csv, filename } = await this.svc.taskReport(pid);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${filename}"` });
    res.send(csv);
  }

  @Get('calendar')
  async calendar(@Res() res: Response) {
    const { ics, filename } = await this.svc.leaveCalendar();
    res.set({ 'Content-Type': 'text/calendar', 'Content-Disposition': `attachment; filename="${filename}"` });
    res.send(ics);
  }
}
