import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting, Application, User } from '../database/entities';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectRepository(JobPosting)  private postings: Repository<JobPosting>,
    @InjectRepository(Application) private applications: Repository<Application>,
    @InjectRepository(User)        private users: Repository<User>,
  ) {}

  // ── Job Postings ───────────────────────────────────────────────────────────
  getPostings(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.postings.find({ where, order: { created_at: 'DESC' } });
  }
  createPosting(dto: any, userId: string) { return this.postings.save(this.postings.create({ ...dto, created_by: userId } as any)); }
  updatePosting(id: string, dto: any) { return this.postings.update(id, dto).then(() => this.postings.findOne({ where: { id } })); }
  deletePosting(id: string) { return this.postings.delete(id).then(() => ({ ok: true })); }

  // ── Applications ───────────────────────────────────────────────────────────
  async getApplications(postingId?: string, status?: string) {
    const where: any = {};
    if (postingId) where.posting_id = postingId;
    if (status) where.status = status;
    const apps = await this.applications.find({ where, order: { created_at: 'DESC' } });
    const postingIds = [...new Set(apps.map(a => a.posting_id))];
    const postings = postingIds.length ? await this.postings.find({ where: postingIds.map(id => ({ id }) as any) }) : [];
    const postingMap = Object.fromEntries(postings.map(p => [p.id, p]));
    return apps.map(a => ({ ...a, posting: postingMap[a.posting_id] }));
  }
  createApplication(dto: any) { return this.applications.save(this.applications.create(dto as any)); }
  updateApplication(id: string, dto: any) { return this.applications.update(id, dto).then(() => this.applications.findOne({ where: { id } })); }
  deleteApplication(id: string) { return this.applications.delete(id).then(() => ({ ok: true })); }
}
