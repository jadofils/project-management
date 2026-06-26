import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../database/entities';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback) private repo: Repository<Feedback>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(userId: string, dto: any) {
    let screenshotUrl: string | null = null;
    if (dto.screenshot && dto.screenshot.length > 100) {
      try {
        const base64 = dto.screenshot.replace(/^data:image\/\w+;base64,/, '');
        screenshotUrl = await this.cloudinary.uploadImage(base64, 'task-manager/feedback');
      } catch { /* ignore */ }
    }
    return this.repo.save(this.repo.create({
      user_id: userId, title: dto.title, description: dto.description ?? null,
      category: dto.category ?? 'other', page_url: dto.page_url ?? null,
      screenshot_url: screenshotUrl,
    } as any));
  }

  async getAll(page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({ order: { created_at: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async assign(id: string, assignedTo: string) {
    await this.repo.update(id, { assigned_to: assignedTo, status: 'in_progress' } as any);
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    await this.repo.update(id, { status } as any);
  }
}
