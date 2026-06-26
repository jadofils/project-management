import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../database/entities';

@Injectable()
export class TasksService {
  constructor(@InjectRepository(Task) private repo: Repository<Task>) {}

  async getByProject(projectId: string) {
    return this.repo.find({ where: { project_id: projectId }, order: { sort_order: 'ASC' } });
  }

  async create(userId: string, dto: any) {
    const count = await this.repo.count({ where: { project_id: dto.project_id, status: 'todo' } });
    return this.repo.save(this.repo.create({ ...dto, sort_order: count } as any));
  }

  async update(id: string, dto: any) {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException();
    Object.assign(task, dto);
    return this.repo.save(task);
  }

  async delete(id: string) { await this.repo.delete(id); }
}
