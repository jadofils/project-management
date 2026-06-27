import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subtask, Task } from '../database/entities';

@Injectable()
export class SubtasksService {
  constructor(
    @InjectRepository(Subtask) private repo: Repository<Subtask>,
    @InjectRepository(Task)    private tasks: Repository<Task>,
  ) {}

  getAll(taskId: string) {
    return this.repo.find({ where: { task_id: taskId }, order: { sort_order: 'ASC', created_at: 'ASC' } });
  }

  async create(taskId: string, dto: { title: string }) {
    const count = await this.repo.count({ where: { task_id: taskId } });
    const sub = await this.repo.save(
      this.repo.create({ task_id: taskId, title: dto.title.trim(), sort_order: count } as any),
    );
    await this.syncCounts(taskId);
    return sub;
  }

  async update(id: string, dto: { title?: string; completed?: boolean }, userId: string) {
    const sub = await this.repo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    if (dto.title !== undefined) sub.title = dto.title.trim();
    if (dto.completed !== undefined) {
      sub.completed    = dto.completed;
      sub.completed_by = dto.completed ? userId : null;
    }
    const saved = await this.repo.save(sub);
    await this.syncCounts(sub.task_id);
    return saved;
  }

  async delete(id: string) {
    const sub = await this.repo.findOne({ where: { id } });
    if (!sub) return;
    await this.repo.delete(id);
    await this.syncCounts(sub.task_id);
  }

  async reorder(orders: { id: string; sort_order: number }[]) {
    await Promise.all(orders.map(({ id, sort_order }) =>
      this.repo.update(id, { sort_order } as any),
    ));
  }

  private async syncCounts(taskId: string) {
    const all   = await this.repo.find({ where: { task_id: taskId } });
    const done  = all.filter(s => s.completed).length;
    await this.tasks.update(taskId, { subtask_count: all.length, subtasks_done: done } as any);
  }
}
