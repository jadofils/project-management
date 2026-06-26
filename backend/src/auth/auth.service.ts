import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from '../database/entities';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  async register(dto: { email: string; password: string; first_name: string; last_name: string }) {
    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.users.create({ email: dto.email, password_hash, first_name: dto.first_name, last_name: dto.last_name } as any);
    const saved = await this.users.save(user) as unknown as User;
    return { user: this.sanitize(saved), token: this.sign(saved) };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.users.findOne({ where: { email: dto.email, is_active: true } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { user: this.sanitize(user), token: this.sign(user) };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }

  private sign(user: User) {
    return jwt.sign(
      { sub: user.id, email: user.email, system_role: user.system_role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRATION || '7d') as any },
    );
  }

  sanitize(u: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...rest } = u as any;
    return rest;
  }
}
