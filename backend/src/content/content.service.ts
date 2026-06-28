import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ContentCategory, ContentTemplate, ContentDraft, ContentPassword } from '../database/entities';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentCategory)  private categories: Repository<ContentCategory>,
    @InjectRepository(ContentTemplate)  private templates: Repository<ContentTemplate>,
    @InjectRepository(ContentDraft)     private drafts: Repository<ContentDraft>,
    @InjectRepository(ContentPassword)  private passwords: Repository<ContentPassword>,
  ) {}

  async getCategories() { return this.categories.find({ order: { name: 'ASC' } }); }
  async createCategory(dto: any) { return this.categories.save(this.categories.create(dto)); }
  async getTemplates(categoryId?: string) {
    const where: any = {};
    if (categoryId) where.category_id = categoryId;
    return this.templates.find({ where });
  }
  async createTemplate(dto: any) { return this.templates.save(this.templates.create(dto)); }

  async getDrafts(userId?: string, categoryId?: string) {
    const where: any = {};
    if (userId) where.user_id = userId;
    if (categoryId) where.category_id = categoryId;
    return this.drafts.find({ where, order: { created_at: 'DESC' } });
  }

  async createDraft(userId: string, dto: any) {
    return this.drafts.save(this.drafts.create({ ...dto, user_id: userId } as any));
  }

  async updateDraft(id: string, dto: any) {
    await this.drafts.update(id, dto);
    return this.drafts.findOne({ where: { id } });
  }

  async deleteDraft(id: string) { await this.drafts.delete(id); return { ok: true }; }

  async publishDraft(id: string, projectId: string) {
    await this.drafts.update(id, { status: 'published', project_id: projectId } as any);
    return this.drafts.findOne({ where: { id } });
  }

  // Password gate
  async verifyPassword(password: string) {
    const record = await this.passwords.find({ order: { created_at: 'DESC' }, take: 1 });
    if (record.length === 0) return { valid: false, reason: 'No password set — admin must configure first' };
    const valid = await bcrypt.compare(password, record[0].password_hash);
    if (!valid) throw new UnauthorizedException('Invalid content access password');
    return { valid: true };
  }

  async setPassword(password: string, userId: string) {
    const hash = await bcrypt.hash(password, 10);
    await this.passwords.save(this.passwords.create({ password_hash: hash, updated_by: userId } as any));
    return { ok: true };
  }
}
