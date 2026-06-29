import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt.guard';
import { ContentService } from './content.service';
import { ContentAIService } from './content-ai.service';

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private svc: ContentService, private ai: ContentAIService) {}

  @Get('categories')  getCategories() { return this.svc.getCategories(); }
  @Post('categories') @UseGuards(AdminGuard) createCategory(@Body() dto: any) { return this.svc.createCategory(dto); }
  @Patch('categories/:id') @UseGuards(AdminGuard) updateCategory(@Param('id') id: string, @Body() dto: any) { return this.svc.updateCategory(id, dto); }
  @Delete('categories/:id') @UseGuards(AdminGuard) deleteCategory(@Param('id') id: string) { return this.svc.deleteCategory(id); }

  @Get('templates')  getTemplates(@Query('category_id') catId?: string) { return this.svc.getTemplates(catId); }
  @Post('templates') @UseGuards(AdminGuard) createTemplate(@Body() dto: any) { return this.svc.createTemplate(dto); }

  @Get('drafts')
  getDrafts(@Req() req: any, @Query('category_id') catId?: string, @Query('status') status?: string) {
    return this.svc.getDrafts(req.user.sub, catId, status);
  }
  @Post('drafts')       createDraft(@Req() req: any, @Body() dto: any) { return this.svc.createDraft(req.user.sub, dto); }
  @Post('drafts/bulk')  bulkCreate(@Req() req: any, @Body('items') items: any[]) { return this.svc.bulkCreate(req.user.sub, items); }
  @Patch('drafts/:id')  updateDraft(@Param('id') id: string, @Body() dto: any) { return this.svc.updateDraft(id, dto); }
  @Delete('drafts/:id') deleteDraft(@Param('id') id: string) { return this.svc.deleteDraft(id); }
  @Patch('drafts/:id/use')
  markUsed(
    @Param('id') id: string,
    @Body('platform') platform?: string,
    @Body('note') note?: string,
  ) { return this.svc.markUsed(id, platform, note); }
  @Post('drafts/:id/publish')
  publishDraft(
    @Param('id') id: string,
    @Body('project_id') projectId: string,
    @Body('scheduled_at') scheduledAt?: string,
  ) { return this.svc.publishDraft(id, projectId, scheduledAt); }

  @Post('verify-password') verifyPassword(@Body('password') password: string) { return this.svc.verifyPassword(password); }
  @Post('set-password') @UseGuards(AdminGuard) setPassword(@Req() req: any, @Body('password') password: string) { return this.svc.setPassword(password, req.user.sub); }

  // ── AI endpoints ────────────────────────────────────────────────────────────
  @Post('ai/batch')
  batchGenerate(
    @Body('category_id')  catId: string,
    @Body('count')        count?: number,
    @Body('custom_topic') customTopic?: string,
    @Body('content_type') contentType?: string,
    @Body('persona')      persona?: string,
  ) { return this.ai.batchGenerate(catId, count || 10, customTopic, contentType || 'post', persona || 'Universal'); }

  @Post('ai/format')
  formatContent(
    @Body('title')    title: string,
    @Body('body')     body: string,
    @Body('platform') platform: string,
  ) { return this.ai.formatContent(title, body, platform); }

  @Post('ai/variants')
  generateVariants(
    @Body('title') title: string,
    @Body('body')  body: string,
  ) { return this.ai.generateVariants(title, body); }

  @Post('ai/analyze-pattern')
  analyzePattern(@Body('post') postText: string) { return this.ai.analyzePattern(postText); }

  @Get('ai/analyze') analyzeContent() { return this.ai.analyzeContent(); }

  @Post('ai/improve')
  improveContent(
    @Body('title') title: string,
    @Body('body')  body: string,
    @Body('platform') platform?: string,
    @Body('engagement_score') engagementScore?: number,
  ) { return this.ai.improveContent(title, body, platform, engagementScore); }
}
