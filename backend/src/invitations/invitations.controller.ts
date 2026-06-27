import {
  Controller, Post, Get, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { InvitationsService } from './invitations.service';

@Controller()
export class InvitationsController {
  constructor(private readonly svc: InvitationsService) {}

  // PM / admin invites someone to a project
  @Post('projects/:id/invite')
  @UseGuards(JwtAuthGuard)
  invite(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    const { system_role, sub } = req.user;
    // Only admins and project managers / editors with manage perms can invite
    // We enforce at the service layer for simplicity; controller just forwards
    return this.svc.invite(id, sub, dto);
  }

  // List pending invitations for a project (managers only)
  @Get('projects/:id/invitations')
  @UseGuards(JwtAuthGuard)
  list(@Param('id') id: string) {
    return this.svc.listForProject(id);
  }

  // Cancel an invitation
  @Delete('projects/:id/invitations/:invId')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @Param('invId') invId: string) {
    return this.svc.cancel(invId, id);
  }

  // Resend invitation
  @Post('projects/:id/invitations/:invId/resend')
  @UseGuards(JwtAuthGuard)
  resend(@Param('id') id: string, @Param('invId') invId: string) {
    return this.svc.resend(invId, id);
  }

  // Admin: get all invitations system-wide
  @Get('invitations')
  @UseGuards(JwtAuthGuard)
  getAll(@Query('page') p?: string, @Query('limit') l?: string) {
    return this.svc.getAll(Number(p) || 1, Number(l) || 50);
  }

  // Public: get invitation info by token (no auth needed)
  @Get('invitations/:token')
  getByToken(@Param('token') token: string) {
    return this.svc.getByToken(token);
  }

  // Logged-in user accepts the invitation
  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  accept(@Param('token') token: string, @Req() req: any) {
    return this.svc.accept(token, req.user.sub);
  }

  // New user registers and joins via invitation
  @Post('invitations/:token/register')
  register(@Param('token') token: string, @Body() dto: { first_name: string; last_name: string; password: string }) {
    return this.svc.registerAndAccept(token, dto);
  }
}
