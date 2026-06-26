import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../database/entities';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(Project) private repo: Repository<Project>) {}

  async getMyProjects(userId: string, systemRole: string) {
    if (systemRole === 'admin') return this.repo.find({ order: { updated_at: 'DESC' } });
    return this.repo.find({ where: { owner_id: userId }, order: { updated_at: 'DESC' } });
  }

  async create(userId: string, dto: any) {
    return this.repo.save(this.repo.create({ name: dto.name, description: dto.description ?? null, owner_id: userId } as any));
  }

  async getOne(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }

  async delete(id: string, userId: string, systemRole: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException();
    if (p.owner_id !== userId && systemRole !== 'admin') throw new ForbiddenException();
    await this.repo.remove(p);
  }
}
