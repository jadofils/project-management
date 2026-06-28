import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ContentDraft, ContentCategory } from '../database/entities';

@Injectable()
export class ContentAIService {
  private readonly logger = new Logger(ContentAIService.name);

  constructor(
    @InjectRepository(ContentDraft) private drafts: Repository<ContentDraft>,
    @InjectRepository(ContentCategory) private categories: Repository<ContentCategory>,
  ) {}

  private get apiKey() { return process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ''; }
  private get apiUrl() { return process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions'; }
  private get model() { return process.env.AI_MODEL || 'gpt-4o-mini'; }

  private async callAI(messages: { role: string; content: string }[], temperature = 0.8): Promise<string> {
    if (!this.apiKey) return '';
    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, messages, temperature, max_tokens: 4000 }),
      });
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (e: any) { this.logger.error(`AI call failed: ${e.message}`); return ''; }
  }

  // ── Batch generate content for a category ──────────────────────────────────
  async batchGenerate(categoryId: string, count = 10) {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    if (!cat) return [];

    // Get existing titles to avoid duplicates
    const existing = await this.drafts.find({ where: { category_id: categoryId }, select: ['title'], order: { created_at: 'DESC' }, take: 50 });
    const existingTitles = existing.map(d => d.title).join('\n- ');

    const prompt = `You are a professional social media content creator specializing in "${cat.name}" content.

Generate ${count} unique social media posts. Each post must be COMPLETELY different from previous ones.

PREVIOUSLY CREATED (DO NOT REPEAT):
- ${existingTitles || 'None yet'}

Category: ${cat.name} — ${cat.description || ''}

Return a JSON array of objects:
[
  {
    "title": "Engaging, catchy title (max 80 chars)",
    "body": "Full post content with emojis and hashtags (150-300 words)",
    "hashtags": ["#tag1", "#tag2", "#tag3"],
    "bestPlatform": "Instagram/TikTok/Twitter/etc"
  }
]

Make each post unique in topic, angle, and tone. Use trending formats, questions, facts, humor.`;

    const result = await this.callAI([{ role: 'user', content: prompt }], 0.9);
    try {
      const cleaned = result.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return [];
    }
  }

  // ── Content Analyzer ──────────────────────────────────────────────────────
  async analyzeContent() {
    const [drafts, categories] = await Promise.all([
      this.drafts.find({ order: { created_at: 'DESC' }, take: 30 }),
      this.categories.find(),
    ]);
    if (drafts.length < 2) return { insights: { message: 'Create more content for AI analysis' } };

    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const summary = drafts.map(d => `[${catMap[d.category_id] || '?'}] "${d.title}"`).join('\n');
    const prompt = `Analyze these content pieces:\n${summary}\n\nReturn JSON: { "topCategories": ["..."], "avgLength": "...", "suggestedTopics": ["...", "..."], "contentGaps": ["..."] }`;
    const result = await this.callAI([{ role: 'user', content: prompt }], 0.3);
    try { return { insights: JSON.parse(result.replace(/```json|```/g, '').trim()) }; }
    catch { return { insights: { raw: result } }; }
  }
}
