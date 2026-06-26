import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../database/entities';
import { CreateProjectDto } from '../common/dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  findAll(ownerId: string) {
    return this.repo.find({ where: { owner_id: ownerId }, order: { created_at: 'DESC' }, relations: ['tasks'] });
  }

  findOne(id: string, ownerId: string) {
    return this.repo.findOne({ where: { id, owner_id: ownerId }, relations: ['tasks'] });
  }

  create(dto: CreateProjectDto, ownerId: string) {
    const project = this.repo.create({ ...dto, owner_id: ownerId });
    return this.repo.save(project);
  }

  async remove(id: string, ownerId: string) {
    const project = await this.repo.findOne({ where: { id, owner_id: ownerId } });
    if (!project) return null;
    await this.repo.remove(project);
    return project;
  }
}
