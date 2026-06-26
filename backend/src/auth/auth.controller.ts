import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BwengeJwtAuthGuard } from './bwenge-jwt.guard';
import { UserCache } from '../database/entities';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(UserCache)
    private readonly userCacheRepo: Repository<UserCache>,
  ) {}

  @Get('me')
  @UseGuards(BwengeJwtAuthGuard)
  getMe(@Req() req: any) {
    const { iat, exp, ...user } = req.user;
    return user;
  }

  @Post('sync')
  @UseGuards(BwengeJwtAuthGuard)
  async syncUser(@Req() req: any, @Body() body: { first_name: string; last_name: string; email: string; avatar_url?: string }) {
    const cached = await this.userCacheRepo.findOne({ where: { user_id: req.user.sub } });
    if (cached) {
      cached.first_name = body.first_name;
      cached.last_name = body.last_name;
      cached.email = body.email;
      cached.avatar_url = body.avatar_url || cached.avatar_url;
      cached.last_synced = new Date();
      await this.userCacheRepo.save(cached);
      return cached;
    }
    const entry = this.userCacheRepo.create({
      user_id: req.user.sub,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      avatar_url: body.avatar_url || null,
      last_synced: new Date(),
    });
    await this.userCacheRepo.save(entry);
    return entry;
  }
}
