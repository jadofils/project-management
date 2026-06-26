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
      take: 100,
    });
  }

  create(projectId: string, senderId: string, content: string) {
    const msg = this.messages.create({ project_id: projectId, sender_id: senderId, content } as any);
    return this.messages.save(msg);
  }
}
