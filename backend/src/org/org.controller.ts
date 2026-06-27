import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt.guard';
import { OrgService } from './org.service';

@Controller('org')
@UseGuards(JwtAuthGuard)
export class OrgController {
  constructor(private svc: OrgService) {}

  // ── Divisions ──────────────────────────────────────────────────────────────
  @Get('divisions')
  getDivisions() { return this.svc.getAllDivisions(); }

  @Post('divisions') @UseGuards(AdminGuard)
  createDivision(@Body() dto: any) { return this.svc.createDivision(dto); }

  @Patch('divisions/:id') @UseGuards(AdminGuard)
  updateDivision(@Param('id') id: string, @Body() dto: any) { return this.svc.updateDivision(id, dto); }

  @Delete('divisions/:id') @UseGuards(AdminGuard)
  deleteDivision(@Param('id') id: string) { return this.svc.deleteDivision(id); }

  // ── Departments ────────────────────────────────────────────────────────────
  @Get('departments')
  getDepartments(@Query('division_id') divisionId?: string) { return this.svc.getDepartments(divisionId); }

  @Post('departments') @UseGuards(AdminGuard)
  createDepartment(@Body() dto: any) { return this.svc.createDepartment(dto); }

  @Patch('departments/:id') @UseGuards(AdminGuard)
  updateDepartment(@Param('id') id: string, @Body() dto: any) { return this.svc.updateDepartment(id, dto); }

  @Delete('departments/:id') @UseGuards(AdminGuard)
  deleteDepartment(@Param('id') id: string) { return this.svc.deleteDepartment(id); }

  // ── Job Positions ──────────────────────────────────────────────────────────
  @Get('positions')
  getPositions(@Query('division_id') divisionId?: string) { return this.svc.getPositions(divisionId); }

  @Post('positions') @UseGuards(AdminGuard)
  createPosition(@Body() dto: any) { return this.svc.createPosition(dto); }

  @Patch('positions/:id') @UseGuards(AdminGuard)
  updatePosition(@Param('id') id: string, @Body() dto: any) { return this.svc.updatePosition(id, dto); }

  @Delete('positions/:id') @UseGuards(AdminGuard)
  deletePosition(@Param('id') id: string) { return this.svc.deletePosition(id); }

  // ── Employee Profiles ──────────────────────────────────────────────────────
  @Get('employees')
  getEmployees(@Query('department_id') departmentId?: string) { return this.svc.getEmployees(departmentId); }

  @Get('employees/:userId')
  getEmployee(@Param('userId') userId: string) { return this.svc.getEmployee(userId); }

  @Post('employees/:userId') @UseGuards(AdminGuard)
  upsertEmployee(@Param('userId') userId: string, @Body() dto: any) { return this.svc.createOrUpdateEmployee(userId, dto); }

  // ── Org Chart ──────────────────────────────────────────────────────────────
  @Get('chart')
  getChart() { return this.svc.getOrgChart(); }
}
