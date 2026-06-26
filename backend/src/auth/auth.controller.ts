import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BwengeJwtAuthGuard } from './bwenge-jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCache } from '../database/entities';

@Controller('auth')
export class AuthController {
  constructor(@InjectRepository(UserCache) private userCacheRepo: Repository<UserCache>) {}

  @Get('me') @UseGuards(BwengeJwtAuthGuard)
  async me(@Req() req: any) {
    const cached = await this.userCacheRepo.findOne({ where: { user_id: req.user.sub } });
    return { id: req.user.sub, email: req.user.email, roles: req.user.roles, cached_profile: cached || null };
  }

  @Post('sync') @UseGuards(BwengeJwtAuthGuard)
  async sync(@Req() req: any, @Body() dto: any) {
    let cached = await this.userCacheRepo.findOne({ where: { user_id: req.user.sub } });
    if (cached) { Object.assign(cached, { ...dto, last_synced: new Date() }); }
    else { cached = this.userCacheRepo.create({ user_id: req.user.sub, first_name: dto.first_name ?? '', last_name: dto.last_name ?? '', email: dto.email ?? req.user.email ?? '', avatar_url: dto.avatar_url ?? null, last_synced: new Date() } as any); }
    return this.userCacheRepo.save(cached);
  }
}
