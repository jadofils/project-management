import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, AdminOrPMGuard } from './jwt.guard';
import { SystemRole } from '../shared/enums';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  // Only admins or project managers can create user accounts
  @Post('register')
  @UseGuards(AdminOrPMGuard)
  createUser(
    @Req() req: any,
    @Body() dto: { email: string; first_name: string; last_name: string; system_role?: SystemRole },
  ) {
    return this.svc.createUser(req.user.sub, dto);
  }

  @Post('login')
  login(@Body() dto: { email: string; password: string }) {
    return this.svc.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.svc.me(req.user.sub);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: { current_password: string; new_password: string }) {
    return this.svc.changePassword(req.user.sub, dto);
  }
}
