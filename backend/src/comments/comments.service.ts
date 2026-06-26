import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../database/entities';

@Injectable()
export class CommentsService {
  constructor(@InjectRepository(Comment) private repo: Repository<Comment>) {}

  async getByTask(taskId: string) {
    return this.repo.find({ where: { task_id: taskId }, order: { created_at: 'ASC' } });
  }

  async create(userId: string, taskId: string, content: string) {
    return this.repo.save(this.repo.create({ task_id: taskId, user_id: userId, content } as any));
  }

  async delete(id: string) {
    await this.repo.delete(id);
  }
}
