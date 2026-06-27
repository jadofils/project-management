import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember, ProjectRole } from '../database/entities';

@Injectable()
export class MembersService {
  constructor(@InjectRepository(ProjectMember) private members: Repository<ProjectMember>) {}

  getByProject(projectId: string) {
    return this.members.find({
      where: { project_id: projectId },
      relations: ['user'],
      order: { joined_at: 'ASC' },
    });
  }

  async add(projectId: string, userId: string, role: ProjectRole, roles?: ProjectRole[], permissionLevel?: string) {
    const existing = await this.members.findOne({ where: { project_id: projectId, user_id: userId } });
    if (existing) {
      existing.role             = role;
      existing.roles            = roles || [role];
      existing.permission_level = permissionLevel || existing.permission_level || 'editor';
      const saved = await this.members.save(existing);
      return this.members.findOne({ where: { id: saved.id }, relations: ['user'] });
    }
    const m = this.members.create({
      project_id:       projectId,
      user_id:          userId,
      role,
      roles:            roles || [role],
      permission_level: permissionLevel || 'editor',
    } as any);
    const saved = await this.members.save(m) as unknown as ProjectMember;
    return this.members.findOne({ where: { id: saved.id }, relations: ['user'] });
  }

  async addBulk(projectId: string, userIds: string[], role: ProjectRole, permissionLevel = 'editor') {
    return Promise.all(userIds.map(uid => this.add(projectId, uid, role, [role], permissionLevel)));
  }

  async updateMember(projectId: string, userId: string, dto: {
    role?: ProjectRole;
    roles?: ProjectRole[];
    permission_level?: string;
  }) {
    const m = await this.members.findOne({ where: { project_id: projectId, user_id: userId } });
    if (!m) throw new NotFoundException('Member not found');
    if (dto.role)             m.role = dto.role;
    if (dto.roles)            m.roles = dto.roles;
    if (dto.permission_level) m.permission_level = dto.permission_level;
    if (dto.roles?.length)    m.role = dto.roles[0];
    const saved = await this.members.save(m);
    return this.members.findOne({ where: { id: saved.id }, relations: ['user'] });
  }

  async remove(projectId: string, userId: string) {
    const m = await this.members.findOne({ where: { project_id: projectId, user_id: userId } });
    if (!m) throw new NotFoundException('Member not found');
    await this.members.remove(m);
    return { ok: true };
  }
}
