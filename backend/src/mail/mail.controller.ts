import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtAuthGuard, AdminOrPMGuard } from '../auth/jwt.guard';
import { MailService } from './mail.service';
import { User, ProjectMember } from '../database/entities';

export type RecipientSpec =
  | { type: 'all' }
  | { type: 'users'; ids: string[] }
  | { type: 'role'; role: string; project_id?: string }
  | { type: 'emails'; emails: string[] };

@Controller('mail')
@UseGuards(AdminOrPMGuard)
export class MailController {
  constructor(
    private mail: MailService,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
  ) {}

  @Post('send')
  async send(
    @Req() req: any,
    @Body() body: { to: RecipientSpec; subject: string; message: string },
  ) {
    const sender = await this.users.findOne({ where: { id: req.user.sub } });
    const senderName = sender ? `${sender.first_name} ${sender.last_name}`.trim() : 'Project Manager';

    const emails = await this.resolveRecipients(body.to, req.user.sub);
    if (emails.length === 0) return { sent: 0, message: 'No recipients found' };

    // Send to each individually so personalisation is possible later
    await Promise.all(
      emails.map(to => this.mail.sendCustom({ to, subject: body.subject, body: body.message, senderName }))
    );

    return { sent: emails.length, recipients: emails };
  }

  private async resolveRecipients(spec: RecipientSpec, excludeId: string): Promise<string[]> {
    switch (spec.type) {
      case 'all': {
        const all = await this.users.find({ where: { is_active: true }, select: ['id', 'email'] });
        return all.filter(u => u.id !== excludeId).map(u => u.email);
      }
      case 'users': {
        const found = await this.users.findBy({ id: In(spec.ids), is_active: true });
        return found.map(u => u.email);
      }
      case 'role': {
        const where: any = { role: spec.role };
        if (spec.project_id) where.project_id = spec.project_id;
        const mems = await this.members.find({ where, relations: ['user'] });
        return mems
          .filter(m => m.user?.is_active && m.user_id !== excludeId)
          .map(m => m.user!.email);
      }
      case 'emails': {
        return spec.emails;
      }
    }
  }
}
