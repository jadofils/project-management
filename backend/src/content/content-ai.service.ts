import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentDraft, ContentCategory } from '../database/entities';

@Injectable()
export class ContentAIService {
  private readonly logger = new Logger(ContentAIService.name);

  constructor(
    @InjectRepository(ContentDraft)    private drafts: Repository<ContentDraft>,
    @InjectRepository(ContentCategory) private categories: Repository<ContentCategory>,
  ) {}

  private get provider() { return (process.env.LLM_PROVIDER || 'openai').toLowerCase(); }
  private get model()    { return process.env.LLM_MODEL || process.env.AI_MODEL || 'gpt-4o-mini'; }

  private async callAI(messages: { role: string; content: string }[], temperature = 0.85): Promise<string> {
    if (this.provider === 'claude' || this.provider === 'anthropic') {
      const key = process.env.ANTHROPIC_API_KEY || '';
      if (!key) throw new BadRequestException('ANTHROPIC_API_KEY is not configured. Set it in your server environment variables.');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: this.model, max_tokens: 6000, messages }),
      });
      const data = await res.json() as any;
      if (data.error) throw new BadRequestException(`Anthropic API error: ${data.error.message || JSON.stringify(data.error)}`);
      return data.content?.[0]?.text || '';
    } else {
      const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
      const url = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
      if (!key) throw new BadRequestException('AI_API_KEY (or OPENAI_API_KEY) is not configured. Set it in your server environment variables.');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: this.model, messages, temperature, max_tokens: 6000 }),
      });
      const data = await res.json() as any;
      if (data.error) throw new BadRequestException(`OpenAI API error: ${data.error.message || JSON.stringify(data.error)}`);
      return data.choices?.[0]?.message?.content || '';
    }
  }

  private parseJSON(raw: string): any {
    try {
      // Extract content from inside code fences if present, otherwise use raw
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const s = (fenced ? fenced[1] : raw).trim();
      const start = s.indexOf('[');
      const end   = s.lastIndexOf(']');
      if (start === -1 || end === -1) return [];
      return JSON.parse(s.slice(start, end + 1));
    } catch { return []; }
  }

  // ── Batch generate ────────────────────────────────────────────────────────
  async batchGenerate(categoryId: string, count = 10, customTopic?: string, contentType = 'post', persona = 'Universal') {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    if (!cat) return [];

    const existing = await this.drafts.find({
      where: { category_id: categoryId }, select: ['title'],
      order: { created_at: 'DESC' }, take: 50,
    });
    const noDupe    = existing.length ? `\nAVOID REPEATING:\n- ${existing.map(d => d.title).join('\n- ')}` : '';
    const topicLine = customTopic ? `\nFOCUS ANGLE: ${customTopic}` : '';
    const personaLine = persona && persona !== 'Universal'
      ? `\nTARGET AUDIENCE: ${persona} — adapt tone, vocabulary and references accordingly.` : '';
    const scoreNote = `\nAlso add "engagementScore": a number 1-10 estimating viral potential.`;

    let prompt: string;

    // ── DIALOG content type ──────────────────────────────────────────────────
    if (contentType === 'dialog') {
      prompt = `You write VIRAL DIALOGUE CARDS for social media.
Two recurring characters:
• Tinyuwizev1.1 (T): Confident, knowledgeable, uses CAPS for emphasis, challenges myths and misconceptions. Never backs down from facts.
• Fatikaramuv1.0 (F): Funny, relatable, gets things wrong then learns, uses emojis naturally, represents the audience's inner voice.

Category: "${cat.name}" — ${cat.description || ''}${topicLine}${personaLine}${noDupe}

Generate ${count} unique dialogue cards. Each must be:
- A mini challenge, debate, or learning moment
- 4–7 exchanges (alternating T and F)
- Funny, surprising, and educational
- Designed to make people STOP scrolling

Return ONLY a valid JSON array:
[{
  "title": "Punchy challenge title (max 65 chars)",
  "dialogue": [
    { "speaker": "T", "text": "Opening statement/question/challenge" },
    { "speaker": "F", "text": "Wrong answer or funny reaction with emojis" },
    { "speaker": "T", "text": "Correction or deeper challenge" },
    { "speaker": "F", "text": "Shocked/learning reaction" },
    { "speaker": "T", "text": "Final fact drop" },
    { "speaker": "F", "text": "Relatable conclusion for audience" }
  ],
  "hashtags": ["#tag1","#tag2","#tag3","#tag4"],
  "bestPlatform": "TikTok",
  "engagementScore": 9
}]${scoreNote}`;

    // ── REEL content type ────────────────────────────────────────────────────
    } else if (contentType === 'reel') {
      prompt = `You write viral TikTok/Reels scripts for "${cat.name}" content.${topicLine}${personaLine}
Generate ${count} unique short-form video scripts with scroll-stopping hooks.${noDupe}

Return ONLY a valid JSON array:
[{
  "title": "Video idea (max 70 chars)",
  "body": "HOOK (first 3 sec):\n[hook]\n\nSCRIPT (30-45 sec):\n[content with [PAUSE] markers]\n\nCTA:\n[strong call to action]",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "bestPlatform": "TikTok",
  "engagementScore": 8
}]${scoreNote}`;

    // ── AUDIO content type ───────────────────────────────────────────────────
    } else if (contentType === 'audio') {
      prompt = `You write podcast/voice-over scripts for "${cat.name}" content.${topicLine}${personaLine}
Generate ${count} unique audio scripts (30-60 seconds when spoken).${noDupe}

Return ONLY a valid JSON array:
[{
  "title": "Episode title (max 70 chars)",
  "body": "Conversational spoken-word script. Natural speech with [PAUSE] markers. CAPS for emphasis. 80-130 words.",
  "hashtags": ["#podcast","#audio","#tag3"],
  "bestPlatform": "Podcast",
  "engagementScore": 7
}]${scoreNote}`;

    // ── POST (default) ───────────────────────────────────────────────────────
    } else {
      prompt = `You are a viral social media content creator for "${cat.name}".${topicLine}${personaLine}
Category: ${cat.description || ''}
Generate ${count} unique posts with maximum engagement.${noDupe}

STYLE RULES — NO emoji at all. Instead use these INFOGRAPHIC-STYLE text markers to add visual punch and personality:
• Label tags: [HOT] [FACT] [MYTH] [TIP] [WARNING] [VIRAL] [REAL TALK] [STUDY SAYS] [PLOT TWIST]
• Symbols: ▸ → ★ ✓ ✗ ◆ !! ?? ... • | —
• Text reactions (inline): lol  XD  ngl  fr fr  smh  omg  bruh  wait what  no way
• Emphasis: ALL CAPS for shocking facts, *asterisks* around KEY words
• Dividers: ─── or === between sections
Write in sections with ALL CAPS headers followed by ':' when content has multiple parts.

Also add "template3d": pick the most fitting 3D visual template for this post's mood:
  classic (float/prismatic/parallax/hologram/vortex) — professional/formal/tech
  space (solar/galaxy/nebula/nightsky/moon) — inspiration/cosmic/mystery
  sky (sun/clouds/sunset/snow/thunder) — emotion/weather/energy
  nature (ocean/volcano/earth/forest/rain) — growth/nature/environment
  creative (matrix/fireworks/neon/plasma/glitch) — entertainment/digital/celebration
Return ONLY a valid JSON array:
[{
  "title": "Scroll-stopping title (max 80 chars)",
  "body": "Full engaging post — storytelling, humor, shocking facts, relatable situations. 100-250 words. Use section headers when applicable.",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "bestPlatform": "Instagram/TikTok/Twitter/Facebook/LinkedIn",
  "engagementScore": 8,
  "template3d": "galaxy"
}]${scoreNote}`;
    }

    const raw = await this.callAI([{ role: 'user', content: prompt }], 0.92);
    const parsed = this.parseJSON(raw);
    if (!parsed.length) this.logger.warn(`parseJSON returned [] — raw AI response: ${raw.slice(0, 500)}`);
    return parsed;
  }

  // ── Platform formatter ────────────────────────────────────────────────────
  async formatContent(title: string, body: string, platform: string) {
    const specs: Record<string, string> = {
      instagram: 'Max 2200 chars, heavy emojis, 30 hashtags at end, conversational & aesthetic, line breaks for readability.',
      tiktok:    'Max 150 chars caption, 3-5 hashtags, punchy hook phrase, trending sounds suggestion in brackets.',
      twitter:   'Max 280 chars OR split into numbered thread (1/N). No hashtags inline — add 2-3 at very end.',
      linkedin:  'Professional, 1500-2000 chars, paragraph format, storytelling arc, 3-5 hashtags, end with question.',
      facebook:  'Conversational, 400-500 chars, 1-2 hashtags, end with a question or poll idea.',
    };
    const spec = specs[platform.toLowerCase()] || 'Adapt appropriately for the platform.';
    const prompt = `Reformat this social media post for ${platform}:
TITLE: ${title}
BODY: ${body}

PLATFORM RULES: ${spec}

Return ONLY a JSON object:
{ "title": "...", "body": "...", "hashtags": ["..."], "note": "brief formatting tip" }`;

    const raw = await this.callAI([{ role: 'user', content: prompt }], 0.6);
    try {
      const s = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
    } catch { return { title, body, hashtags: [], note: 'Could not reformat' }; }
  }

  // ── A/B title variants ────────────────────────────────────────────────────
  async generateVariants(title: string, body: string) {
    const prompt = `You are an expert at writing viral social media titles/hooks.
Given this content:
TITLE: ${title}
BODY (first 200 chars): ${body.slice(0, 200)}

Generate 4 alternative title/hook variants that could outperform the original.
Each should use a DIFFERENT psychological trigger: curiosity gap, controversy, humor, shock value.

Return ONLY a JSON array:
[{ "title": "...", "trigger": "curiosity/controversy/humor/shock", "why": "one sentence why this works" }]`;

    const raw = await this.callAI([{ role: 'user', content: prompt }], 0.88);
    return this.parseJSON(raw);
  }

  // ── Viral pattern analyzer ────────────────────────────────────────────────
  async analyzePattern(postText: string) {
    const prompt = `Analyze this viral social media post and extract the formula:

POST:
${postText}

Identify and explain:
1. Hook type (question/shock/controversy/story/list/challenge)
2. Emotional trigger (fear/joy/anger/curiosity/pride/nostalgia)
3. Content format (rant/tutorial/story/debate/list/meme)
4. Why it works (2-3 sentences)
5. Replicable template (generic version someone could fill in)

Return ONLY a JSON object:
{
  "hookType": "...",
  "emotionTrigger": "...",
  "format": "...",
  "whyItWorks": "...",
  "template": "...",
  "score": 8
}`;

    const raw = await this.callAI([{ role: 'user', content: prompt }], 0.4);
    try {
      const s = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
    } catch { return { hookType: 'unknown', whyItWorks: 'Analysis failed', template: '', score: 0 }; }
  }

  // ── Improvement recommendations ───────────────────────────────────────────
  async improveContent(title: string, body: string, platform?: string, engagementScore?: number) {
    const platformNote = platform ? `Currently targeting: ${platform}.` : '';
    const scoreNote = engagementScore ? `Current AI engagement score: ${engagementScore}/10.` : '';
    const prompt = `You are a viral content strategist. Analyze this social media post and give SPECIFIC improvement recommendations.

TITLE: ${title}
BODY:
${body}
${platformNote} ${scoreNote}

Give EXACTLY 5 actionable recommendations in these categories:
1. HOOK — how to make the opening more scroll-stopping (rewrite the first sentence)
2. STRUCTURE — improve readability, pacing, use of markers [HOT] [FACT] etc
3. HASHTAGS — 5 better hashtags that will reach more people + why
4. CTA — a stronger call-to-action that drives engagement
5. PLATFORM — which platform this suits best and one platform-specific tweak

Also analyze the content and return:
- platforms: score this content's fit for each of: Instagram, TikTok, Twitter, LinkedIn, Facebook, YouTube, Pinterest (1-10 score each, only include score >= 5)
- convertTo: recommend 3-4 content format conversions that would make this content MORE powerful. Choose from: carousel (multi-slide post), infographic (data/tips visual), video_script (short video with scenes), image_quote (single pull-quote card), thread (numbered multi-post series), podcast_script (audio narration), story_slides (vertical story slides), meme (visual joke format). For each give an "action" mapping: carousel→"slides", infographic→"image", video_script→"slides", image_quote→"image", thread→"copy", podcast_script→"audio", story_slides→"slides", meme→"image"

Return ONLY a JSON object:
{
  "hook": { "issue": "one sentence problem", "rewrite": "new first sentence or hook" },
  "structure": { "issue": "one sentence problem", "fix": "specific suggestion" },
  "hashtags": { "suggested": ["#tag1","#tag2","#tag3","#tag4","#tag5"], "reason": "one sentence why" },
  "cta": { "current": "current ending or CTA", "better": "improved CTA text" },
  "platform": { "best": "Instagram/TikTok/LinkedIn/Twitter/Facebook", "tip": "one platform-specific tip" },
  "platforms": [
    { "name": "Instagram", "score": 9, "reason": "one sentence why", "tip": "one platform-specific action" },
    { "name": "TikTok", "score": 7, "reason": "one sentence why", "tip": "one platform-specific action" }
  ],
  "convertTo": [
    { "format": "carousel", "label": "Carousel Slides", "reason": "why this format would perform better", "action": "slides" },
    { "format": "infographic", "label": "Infographic", "reason": "why this format would perform better", "action": "image" }
  ],
  "scoreImprovement": "estimated new score 1-10 if these are applied"
}`;

    const raw = await this.callAI([{ role: 'user', content: prompt }], 0.5);
    try {
      const s = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
    } catch { return { error: 'Could not parse recommendations' }; }
  }

  // ── Content library analyzer ──────────────────────────────────────────────
  async analyzeContent() {
    const [drafts, categories] = await Promise.all([
      this.drafts.find({ order: { created_at: 'DESC' }, take: 30 }),
      this.categories.find(),
    ]);
    if (drafts.length < 2) return { insights: { message: 'Create more content for AI analysis' } };

    const catMap  = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const summary = drafts.map(d => `[${catMap[d.category_id] || '?'}] "${d.title}"`).join('\n');
    const prompt  = `Analyze these content pieces:\n${summary}\n\nReturn JSON:
{ "topCategories": ["..."], "avgLength": "...", "suggestedTopics": ["..."], "contentGaps": ["..."] }`;
    const raw = await this.callAI([{ role: 'user', content: prompt }], 0.3);
    try { return { insights: JSON.parse(raw.replace(/```json|```/g, '').trim()) }; }
    catch { return { insights: { raw } }; }
  }
}
