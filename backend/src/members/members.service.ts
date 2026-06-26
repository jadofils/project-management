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

  async add(projectId: string, userId: string, role: ProjectRole) {
    const existing = await this.members.findOne({ where: { project_id: projectId, user_id: userId } });
    if (existing) {
      existing.role = role;
      return this.members.save(existing);
    }
    const m = this.members.create({ project_id: projectId, user_id: userId, role } as any);
    return this.members.save(m);
  }

  async updateRole(projectId: string, userId: string, role: ProjectRole) {
    const m = await this.members.findOne({ where: { project_id: projectId, user_id: userId } });
    if (!m) throw new NotFoundException('Member not found');
    m.role = role;
    return this.members.save(m);
  }

  async remove(projectId: string, userId: string) {
    const m = await this.members.findOne({ where: { project_id: projectId, user_id: userId } });
    if (!m) throw new NotFoundException('Member not found');
    await this.members.remove(m);
    return { ok: true };
  }
}
