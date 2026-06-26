import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../database/entities';
import { CreateFeedbackDto } from '../common/dto';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly repo: Repository<Feedback>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateFeedbackDto, userId: string) {
    let screenshotUrl: string | null = null;
    if (dto.screenshot) {
      screenshotUrl = await this.cloudinary.uploadImage(dto.screenshot);
    }
    const feedback = this.repo.create({
      user_id: userId,
      title: dto.title,
      description: dto.description || null,
      category: dto.category || 'other',
      screenshot_url: screenshotUrl,
    });
    return this.repo.save(feedback);
  }

  findAll() {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async assign(id: string, assigned_to: string) {
    await this.repo.update(id, { assigned_to });
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }
}
