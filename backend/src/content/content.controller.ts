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
  @Post('drafts/bulk') bulkCreate(@Req() req: any, @Body('items') items: any[]) { return this.svc.bulkCreate(req.user.sub, items); }
  @Patch('drafts/:id') updateDraft(@Param('id') id: string, @Body() dto: any) { return this.svc.updateDraft(id, dto); }
  @Delete('drafts/:id') deleteDraft(@Param('id') id: string) { return this.svc.deleteDraft(id); }
  @Post('drafts/:id/publish') publishDraft(@Param('id') id: string, @Body('project_id') projectId: string) { return this.svc.publishDraft(id, projectId); }

  @Post('verify-password') verifyPassword(@Body('password') password: string) { return this.svc.verifyPassword(password); }
  @Post('set-password') @UseGuards(AdminGuard) setPassword(@Req() req: any, @Body('password') password: string) { return this.svc.setPassword(password, req.user.sub); }

  @Post('ai/batch') batchGenerate(@Body('category_id') catId: string, @Body('count') count?: number) { return this.ai.batchGenerate(catId, count || 10); }
  @Get('ai/analyze') analyzeContent() { return this.ai.analyzeContent(); }
}
