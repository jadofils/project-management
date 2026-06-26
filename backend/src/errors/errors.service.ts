import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog } from '../database/entities';
import { LogErrorDto } from '../common/dto';

@Injectable()
export class ErrorsService {
  constructor(
    @InjectRepository(ErrorLog)
    private readonly repo: Repository<ErrorLog>,
  ) {}

  create(dto: LogErrorDto) {
    const entry = this.repo.create(dto);
    return this.repo.save(entry);
  }

  findAll() {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async markRead(id: string) {
    await this.repo.update(id, { status: 'read' });
    return this.repo.findOne({ where: { id } });
  }

  async markAllRead() {
    await this.repo.update({ status: 'unread' }, { status: 'read' });
    return { updated: true };
  }
}
