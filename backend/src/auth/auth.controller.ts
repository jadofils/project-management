import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Post('register')
  register(@Body() dto: { email: string; password: string; first_name: string; last_name: string }) {
    return this.svc.register(dto);
  }

  @Post('login')
  login(@Body() dto: { email: string; password: string }) {
    return this.svc.login(dto);
  }

  @Get('me') @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.svc.me(req.user.sub);
  }
}
