import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../database/entities';
import { CreateTaskDto, UpdateTaskDto } from '../common/dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  findByProject(projectId: string) {
    return this.repo.find({ where: { project_id: projectId }, order: { sort_order: 'ASC', created_at: 'DESC' } });
  }

  create(dto: CreateTaskDto) {
    const task = this.repo.create(dto);
    return this.repo.save(task);
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) return null;
    await this.repo.remove(task);
    return task;
  }
}
