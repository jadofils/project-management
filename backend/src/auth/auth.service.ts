import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { User, ProjectMember } from '../database/entities';
import { MailService } from '../mail/mail.service';
import { SystemRole, ProjectRole } from '../shared/enums';

function generateStrongPassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const bytes = crypto.randomBytes(length);
  let pass = '';
  for (let i = 0; i < length; i++) pass += chars[bytes[i] % chars.length];
  return pass;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
    private mail: MailService,
  ) {}

  async createUser(
    requesterId: string,
    dto: { email: string; first_name: string; last_name: string; system_role?: SystemRole },
  ) {
    const requester = await this.users.findOne({ where: { id: requesterId } });
    if (!requester) throw new UnauthorizedException();
    if (requester.system_role !== SystemRole.ADMIN) {
      const pmCount = await this.members.count({ where: { user_id: requesterId, role: ProjectRole.PROJECT_MANAGER } });
      if (pmCount === 0) throw new ForbiddenException('Only admins or project managers can create users');
    }

    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const generatedPassword = generateStrongPassword();
    const password_hash = await bcrypt.hash(generatedPassword, 10);
    const user = this.users.create({
      email: dto.email, password_hash,
      first_name: dto.first_name, last_name: dto.last_name,
      system_role: dto.system_role || SystemRole.USER,
      must_change_password: true,
    } as any);
    const saved = await this.users.save(user) as unknown as User;

    const requesterName = `${requester.first_name} ${requester.last_name}`.trim();
    this.mail.sendInvitation({
      to: saved.email,
      recipientName: `${saved.first_name} ${saved.last_name}`.trim(),
      inviterName: requesterName,
      tempPassword: generatedPassword,
    }).catch(e => this.logger.error('Welcome email failed', e));

    return { user: this.sanitize(saved) };
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

  async changePassword(userId: string, dto: { current_password: string; new_password: string }) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    user.password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.users.save(user);
    return { ok: true };
  }

  private sign(user: User) {
    return jwt.sign(
      { sub: user.id, email: user.email, system_role: user.system_role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRATION || '7d') as any },
    );
  }

  sanitize(u: User) {
    const { password_hash, ...rest } = u as any;
    return rest;
  }
}
