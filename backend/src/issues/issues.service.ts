import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue } from '../database/entities';
import { CreateIssueDto } from '../common/dto';

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue)
    private readonly repo: Repository<Issue>,
  ) {}

  findByProject(projectId: string) {
    return this.repo.find({ where: { project_id: projectId }, order: { created_at: 'DESC' } });
  }

  create(dto: CreateIssueDto, userId: string) {
    const issue = this.repo.create({ ...dto, reported_by: userId });
    return this.repo.save(issue);
  }

  async updateStatus(id: string, status: string) {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }
}
