import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, ProjectMember } from '../database/entities';

const PUBLIC_COLS: (keyof User)[] = ['id', 'email', 'first_name', 'last_name', 'avatar_url', 'bio', 'phone', 'system_role', 'is_active', 'created_at'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
  ) {}

  async findAll(requesterId?: string, isAdmin = false) {
    if (isAdmin || !requesterId) {
      return this.users.find({ select: PUBLIC_COLS, order: { created_at: 'ASC' } });
    }
    // Non-admin: return only users who share at least one project with the requester
    const myMemberships = await this.members.find({ where: { user_id: requesterId } });
    if (!myMemberships.length) {
      // Not a member of any project — return only themselves
      return this.users.find({ where: { id: requesterId }, select: PUBLIC_COLS });
    }
    const projectIds = myMemberships.map(m => m.project_id);
    const coMembers  = await this.members.find({ where: { project_id: In(projectIds) } });
    const userIds    = [...new Set(coMembers.map(m => m.user_id))];
    return this.users.find({ where: { id: In(userIds) }, select: PUBLIC_COLS, order: { created_at: 'ASC' } });
  }

  async findOne(id: string) {
    const user = await this.users.findOne({ where: { id }, select: PUBLIC_COLS });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: Partial<Pick<User, 'first_name' | 'last_name' | 'system_role' | 'is_active' | 'avatar_url' | 'bio' | 'phone'>>) {
    await this.users.update(id, dto as any);
    return this.findOne(id);
  }

  async deactivate(id: string) {
    await this.users.update(id, { is_active: false });
    return this.findOne(id);
  }

  async permanentDelete(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.users.delete(id);
    return { ok: true, deleted: user.email };
  }

  async resetAllPasswords(defaultPassword = 'Password123!', excludeEmail = 'jasezikeye50@gmail.com') {
    const hash = await bcrypt.hash(defaultPassword, 10);
    const users = await this.users.find({ where: { email: Not(excludeEmail) } });
    await Promise.all(users.map(u => this.users.update(u.id, { password_hash: hash, must_change_password: true } as any)));
    return { ok: true, updated: users.length, excluded: excludeEmail };
  }
}
