import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt.guard';
import { ContentService } from './content.service';
import { ContentAIService } from './content-ai.service';

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private svc: ContentService, private ai: ContentAIService) {}

  @Get('categories') getCategories() { return this.svc.getCategories(); }
  @Post('categories') @UseGuards(AdminGuard) createCategory(@Body() dto: any) { return this.svc.createCategory(dto); }
  @Get('templates') getTemplates(@Query('category_id') catId?: string) { return this.svc.getTemplates(catId); }
  @Post('templates') @UseGuards(AdminGuard) createTemplate(@Body() dto: any) { return this.svc.createTemplate(dto); }

  @Get('drafts') getDrafts(@Req() req: any, @Query('category_id') catId?: string) { return this.svc.getDrafts(req.user.sub, catId); }
  @Post('drafts') createDraft(@Req() req: any, @Body() dto: any) { return this.svc.createDraft(req.user.sub, dto); }
  @Patch('drafts/:id') updateDraft(@Param('id') id: string, @Body() dto: any) { return this.svc.updateDraft(id, dto); }
  @Delete('drafts/:id') deleteDraft(@Param('id') id: string) { return this.svc.deleteDraft(id); }
  @Post('drafts/:id/publish') publishDraft(@Param('id') id: string, @Body('project_id') projectId: string) { return this.svc.publishDraft(id, projectId); }

  @Post('verify-password') verifyPassword(@Body('password') password: string) { return this.svc.verifyPassword(password); }
  @Post('set-password') @UseGuards(AdminGuard) setPassword(@Req() req: any, @Body('password') password: string) { return this.svc.setPassword(password, req.user.sub); }

  // ── AI endpoints ───────────────────────────────────────────────────────────
  @Post('ai/generate-title') generateTitle(@Body('category_id') catId: string, @Body('topic') topic?: string) { return this.ai.generateTitle(catId, topic); }
  @Post('ai/generate-body') generateBody(@Body('category_id') catId: string, @Body('title') title: string, @Body('language') language?: string) { return this.ai.generateBody(catId, title, language); }
  @Post('ai/generate-image') generateImagePrompt(@Body('category_id') catId: string, @Body('title') title: string, @Body('body') body: string) { return this.ai.generateImagePrompt(catId, title, body); }
  @Post('ai/generate-infographic') generateInfographic(@Body('category_id') catId: string, @Body('title') title: string, @Body('body') body: string) { return this.ai.generateInfographic(catId, title, body); }
  @Post('ai/generate-from-idea') generateFromIdea(@Body('category_id') catId: string, @Body('idea') idea: string, @Body('language') language?: string) { return this.ai.generateFromIdea(catId, idea, language); }
  @Get('ai/analyze') analyzeContent() { return this.ai.analyzePastContent(); }
}
