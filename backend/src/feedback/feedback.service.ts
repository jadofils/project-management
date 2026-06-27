import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackReply } from '../database/entities';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback) private repo: Repository<Feedback>,
    @InjectRepository(FeedbackReply) private replies: Repository<FeedbackReply>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(userId: string, dto: any) {
    let screenshotUrl: string | null = null;
    if (dto.screenshot && dto.screenshot.length > 100) {
      try {
        const base64 = dto.screenshot.replace(/^data:image\/\w+;base64,/, '');
        screenshotUrl = await this.cloudinary.uploadImage(base64, 'task-manager/feedback');
      } catch { this.logger.error('Feedback screenshot upload failed'); }
    }
    return this.repo.save(this.repo.create({
      user_id: userId,
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category ?? 'other',
      page_url: dto.page_url ?? null,
      screenshot_url: screenshotUrl,
      project_id: dto.project_id || null,
    } as any));
  }

  async getAll(projectId?: string, page = 1, limit = 20) {
    const where: any = {};
    if (projectId) where.project_id = projectId;
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async assign(id: string, assignedTo: string) {
    await this.repo.update(id, { assigned_to: assignedTo, status: 'in_progress' } as any);
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    await this.repo.update(id, { status } as any);
  }

  async addReply(feedbackId: string, userId: string, content: string) {
    const reply = this.replies.create({ feedback_id: feedbackId, user_id: userId, content } as any);
    const saved = await this.replies.save(reply);
    await this.repo.increment({ id: feedbackId }, 'reply_count', 1);
    return saved;
  }

  async getReplies(feedbackId: string) {
    return this.replies.find({
      where: { feedback_id: feedbackId },
      order: { created_at: 'ASC' },
    });
  }
}
