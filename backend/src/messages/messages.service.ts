import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMessage } from '../database/entities';

@Injectable()
export class MessagesService {
  constructor(@InjectRepository(ProjectMessage) private messages: Repository<ProjectMessage>) {}

  getByProject(projectId: string) {
    return this.messages.find({
      where: { project_id: projectId },
      relations: ['sender'],
      order: { created_at: 'ASC' },
      take: 200,
    });
  }

  async create(
    projectId: string,
    senderId: string,
    content: string,
    opts?: {
      type?: string;
      file_url?: string;
      file_name?: string;
      reply_to_id?: string;
      task_id?: string;
    },
  ) {
    const msg = this.messages.create({
      project_id: projectId,
      sender_id: senderId,
      content,
      type: opts?.type || 'text',
      file_url: opts?.file_url || null,
      file_name: opts?.file_name || null,
      reply_to_id: opts?.reply_to_id || null,
      task_id: opts?.task_id || null,
    } as any);
    const saved = await this.messages.save(msg) as unknown as ProjectMessage;
    return this.messages.findOne({ where: { id: saved.id }, relations: ['sender'] });
  }
}
