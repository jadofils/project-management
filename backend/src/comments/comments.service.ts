import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../database/entities';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(Comment) private repo: Repository<Comment>,
    private tasks: TasksService,
  ) {}

  async getByTask(taskId: string) {
    return this.repo.find({ where: { task_id: taskId }, order: { created_at: 'ASC' } });
  }

  async create(userId: string, taskId: string, content: string) {
    const comment = await this.repo.save(this.repo.create({ task_id: taskId, user_id: userId, content } as any));
    this.tasks.notifyComment(taskId, userId, content).catch(e => this.logger.error('Comment notify failed', e));
    return comment;
  }

  async delete(id: string) { await this.repo.delete(id); }
}
