import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    if (!this.apiKey) {
      this.logger.warn('AI_API_KEY not set — returning empty');
      return '';
    }
    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, messages, temperature, max_tokens: 2000 }),
      });
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (e: any) {
      this.logger.error(`AI call failed: ${e.message}`);
      return '';
    }
  }

  // ── Title generation ──────────────────────────────────────────────────────
  async generateTitle(categoryId: string, topic?: string) {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    const catName = cat?.name || 'content';
    const prompt = `Generate 5 creative, engaging titles for ${catName} content${topic ? ` about "${topic}"` : ''}. 
Each title should be on a new line, numbered. Make them catchy and social-media friendly.
Focus on: ${cat?.description || 'general audience engagement'}.`;
    const result = await this.callAI([{ role: 'user', content: prompt }]);
    return { titles: result.split('\n').filter(l => l.trim()) };
  }

  // ── Content body generation ───────────────────────────────────────────────
  async generateBody(categoryId: string, title: string, language = 'en') {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    const catName = cat?.name || 'content';
    const langMap: Record<string, string> = { en: 'English', fr: 'French', rw: 'Kinyarwanda', es: 'Spanish' };

    const prompt = `Write engaging social media content for the ${catName} category.
Title: "${title}"
Language: ${langMap[language] || 'English'}
Requirements:
- 150-300 words
- Use emojis naturally (1-2 per paragraph)
- Include 3-5 relevant hashtags at the end
- Make it shareable and engaging
- Add a call-to-action at the end`;
    const result = await this.callAI([{ role: 'user', content: prompt }]);
    return { body: result };
  }

  // ── Image prompt generation ───────────────────────────────────────────────
  async generateImagePrompt(categoryId: string, title: string, body: string) {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    const prompt = `Create a detailed image generation prompt for this ${cat?.name || ''} content:
Title: "${title}"
Content: "${body.slice(0, 300)}"
Generate a DALL-E/Midjourney prompt that:
- Matches the category tone (${cat?.description || 'professional'})
- Is visually striking
- Suitable for social media
- No text in the image
- Professional, clean aesthetic`;
    const result = await this.callAI([{ role: 'user', content: prompt }]);
    return { imagePrompt: result };
  }

  // ── Infographic template ──────────────────────────────────────────────────
  async generateInfographic(categoryId: string, title: string, body: string) {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    const prompt = `Create a structured infographic outline for this ${cat?.name || ''} content:
Title: "${title}"
Content: "${body.slice(0, 500)}"

Output format (JSON-like structure):
{
  "sections": [
    { "heading": "...", "icon": "...", "text": "..." }
  ],
  "keyStats": ["...", "..."],
  "cta": "..."
}`;
    const result = await this.callAI([{ role: 'user', content: prompt }], 0.5);
    try {
      return { infographic: JSON.parse(result) };
    } catch {
      return { infographic: { sections: [], keyStats: [], cta: '', raw: result } };
    }
  }

  // ── Content Analyzer — learns from past content ──────────────────────────
  async analyzePastContent() {
    const recent = await this.drafts.find({ order: { created_at: 'DESC' }, take: 20 });
    if (recent.length < 3) return { suggestions: ['Create more content to enable AI analysis'] };

    const allCats = await this.categories.find();
    const catMap = Object.fromEntries(allCats.map(c => [c.id, c.name]));

    const summary = recent.map(d => `[${catMap[d.category_id] || 'Unknown'}] ${d.title}: ${d.body.slice(0, 100)}...`).join('\n');
    const prompt = `Analyze these recent social media posts and provide recommendations:

${summary}

Return JSON: { "bestPerforming": ["...", "..."], "suggestedTopics": ["...", "..."], "trendingFormats": ["...", "..."], "bestTimeToPost": "...", "improvementTips": ["..."] }`;
    const result = await this.callAI([{ role: 'user', content: prompt }], 0.3);
    try { return { analysis: JSON.parse(result) }; }
    catch { return { analysis: { raw: result } }; }
  }

  // ── Full content generation from idea ──────────────────────────────────────
  async generateFromIdea(categoryId: string, idea: string, language = 'en') {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    const langMap: Record<string, string> = { en: 'English', fr: 'French', rw: 'Kinyarwanda', es: 'Spanish' };

    const prompt = `You are a professional social media content creator for "${cat?.name}" content.

User's idea: "${idea}"
Language: ${langMap[language] || 'English'}

Create a complete social media post. Return JSON:
{
  "title": "Engaging, catchy title",
  "body": "The full post content with emojis, hashtags, and CTA",
  "suggestedImage": "Description for an image that would accompany this post",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "bestPlatform": "Instagram/TikTok/Twitter/etc"
}`;
    const result = await this.callAI([{ role: 'user', content: prompt }], 0.9);
    try { return JSON.parse(result); }
    catch { return { title: idea, body: result, suggestedImage: '', hashtags: [], bestPlatform: '' }; }
  }
}
