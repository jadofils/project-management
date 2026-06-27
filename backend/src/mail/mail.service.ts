import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { EmailLog } from '../database/entities';

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'task_review'
  | 'comment_added'
  | 'phase_task_created';

export interface TaskMailPayload {
  to: string;
  recipientName: string;
  type: NotificationType;
  taskTitle: string;
  taskDescription?: string;
  projectName?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  actorName?: string;
  comment?: string;
  phase?: string;
}

export interface InvitationPayload {
  to: string;
  recipientName: string;
  inviterName: string;
  tempPassword?: string;
}

export interface CustomMailPayload {
  to: string | string[];
  subject: string;
  body: string;
  senderName?: string;
  project_id?: string;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Under Review', done: 'Done',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a',
};

const PHASE_LABELS: Record<string, string> = {
  backend: 'Backend', frontend: 'Frontend', documentation: 'Documentation',
  qa_testing: 'QA Testing', data_analyst: 'Data Analysis',
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(EmailLog) private emailLogs: Repository<EmailLog>,
  ) {
    const mailUser = process.env.MAIL_USER;
    const mailPass = process.env.MAIL_PASS;
    if (!mailUser || !mailPass) {
      this.logger.warn('MAIL_USER or MAIL_PASS not set — email sending disabled');
      this.transporter = null!;
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: mailUser, pass: mailPass },
    });
  }

  private get from() {
    const mailUser = process.env.MAIL_USER;
    return mailUser ? `"Project Manager" <${mailUser}>` : '';
  }

  private async logEmail(opts: {
    type: string;
    sender_id?: string;
    recipient: string;
    subject: string;
    project_id?: string;
    related_id?: string;
    status: 'sent' | 'failed';
    error_message?: string;
  }) {
    try {
      await this.emailLogs.save(this.emailLogs.create({
        type: opts.type,
        sender_id: opts.sender_id || null,
        recipient: opts.recipient,
        subject: opts.subject,
        project_id: opts.project_id || null,
        related_id: opts.related_id || null,
        status: opts.status,
        error_message: opts.error_message || null,
      } as any));
    } catch { this.logger.warn('EmailLog persistence failed'); }
  }

  private async deliver(to: string | string[], subject: string, html: string, meta?: {
    type?: string;
    sender_id?: string;
    project_id?: string;
    related_id?: string;
  }) {
    if (!this.transporter) {
      this.logger.warn(`Email skipped (no transporter): "${subject}"`);
      return;
    }
    const recipients = Array.isArray(to) ? to : [to];
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent "${subject}" → ${recipients.length} recipient(s)`);
      for (const r of recipients) {
        this.logEmail({ type: meta?.type || 'generic', sender_id: meta?.sender_id, recipient: r, subject, project_id: meta?.project_id, related_id: meta?.related_id, status: 'sent' });
      }
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Failed to send email: ${msg}`);
      for (const r of recipients) {
        this.logEmail({ type: meta?.type || 'generic', sender_id: meta?.sender_id, recipient: r, subject, project_id: meta?.project_id, related_id: meta?.related_id, status: 'failed', error_message: msg });
      }
    }
  }

  // ── Task notifications ────────────────────────────────────────────────────
  async send(payload: TaskMailPayload): Promise<void> {
    const { subject, html } = this.buildTaskEmail(payload);
    await this.deliver(payload.to, subject, html, { type: payload.type });
  }

  // ── Project invitation — new user (registration link) ────────────────────
  async sendProjectInviteNew(opts: {
    to: string; inviterName: string; projectName: string; role: string;
    token: string; expiresAt: Date; project_id?: string; sender_id?: string; invitation_id?: string;
  }): Promise<void> {
    const appUrl  = process.env.FRONTEND_URL || 'https://project-management-nine-roan.vercel.app';
    const link    = `${appUrl}?invite=${opts.token}`;
    const expiry  = opts.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const html = this.wrapEmail(`
      <p>Hi there,</p>
      <p><strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.projectName}</strong> as a <strong>${opts.role.replace(/_/g, ' ')}</strong>.</p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;">Accept Invitation &rarr;</a>
      </div>

      <p style="font-size:12px;color:#94a3b8;text-align:center;">This invitation expires on <strong>${expiry}</strong>. If you didn't expect this, you can safely ignore it.</p>
      <p style="font-size:12px;color:#94a3b8;text-align:center;">Or copy this link: <span style="word-break:break-all;">${link}</span></p>
    `);
    await this.deliver(opts.to, `You're invited to join ${opts.projectName}`, html, {
      type: 'invitation_new', sender_id: opts.sender_id, project_id: opts.project_id, related_id: opts.invitation_id,
    });
  }

  // ── Project invitation — existing user (direct add notification) ──────────
  async sendProjectAddedNotification(opts: {
    to: string; recipientName: string; inviterName: string;
    projectName: string; role: string; appUrl?: string; project_id?: string; sender_id?: string;
  }): Promise<void> {
    const url = opts.appUrl || process.env.FRONTEND_URL || 'https://project-management-nine-roan.vercel.app';
    const html = this.wrapEmail(`
      <p>Hi <strong>${opts.recipientName}</strong>,</p>
      <p><strong>${opts.inviterName}</strong> has added you to the project <strong>${opts.projectName}</strong> as a <strong>${opts.role.replace(/_/g, ' ')}</strong>.</p>
      <p>You can now access the project directly from your dashboard.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;">Open Project Manager &rarr;</a>
      </div>
    `);
    await this.deliver(opts.to, `You've been added to ${opts.projectName}`, html, {
      type: 'invitation_existing', sender_id: opts.sender_id, project_id: opts.project_id,
    });
  }

  // ── Invitation email ──────────────────────────────────────────────────────
  async sendInvitation(payload: InvitationPayload): Promise<void> {
    const appUrl = process.env.FRONTEND_URL || 'https://project-management-nine-roan.vercel.app';
    const subject = `You've been invited to Project Manager`;
    const passwordSection = payload.tempPassword ? `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin:20px 0;">
        <h3 style="margin:0 0 14px;font-size:15px;color:#0369a1;">Your Temporary Password</h3>
        <p style="font-size:13px;margin:0;">Use this password to sign in. You will be prompted to change it upon first login.</p>
        <div style="margin-top:12px;background:#fff;border:1px dashed #bae6fd;border-radius:8px;padding:10px 16px;text-align:center;">
          <code style="font-size:16px;font-weight:700;color:#0369a1;letter-spacing:1px;">${payload.tempPassword}</code>
        </div>
      </div>
    ` : `
      <p style="font-size:13px;color:#64748b;margin-top:20px;">Please contact <strong>${payload.inviterName}</strong> for your login credentials.</p>
    `;
    const html = this.wrapEmail(`
      <p>Hi <strong>${payload.recipientName}</strong>,</p>
      <p><strong>${payload.inviterName}</strong> has created an account for you on <strong>Project Manager</strong> — your team's project tracking system.</p>
      ${passwordSection}
      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;">Go to Project Manager →</a>
      </div>
    `);
    await this.deliver(payload.to, subject, html, { type: 'welcome' });
  }

  // ── Custom / bulk email ───────────────────────────────────────────────────
  async sendCustom(payload: CustomMailPayload, sender_id?: string): Promise<void> {
    const senderLabel = payload.senderName ? ` from <strong>${payload.senderName}</strong>` : '';
    const html = this.wrapEmail(`
      <p>You have received a message${senderLabel}:</p>
      <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:16px 20px;border-radius:0 10px 10px 0;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#1e293b;white-space:pre-line;line-height:1.7;">${payload.body}</p>
      </div>
    `);
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    for (const r of recipients) {
      await this.deliver(r, payload.subject, html, {
        type: 'custom', sender_id, project_id: payload.project_id,
      });
    }
  }

  // ── Email builder ─────────────────────────────────────────────────────────
  private buildTaskEmail(p: TaskMailPayload): { subject: string; html: string } {
    const appUrl = process.env.FRONTEND_URL || 'https://project-management-nine-roan.vercel.app';
    const priorityColor = PRIORITY_COLORS[p.priority || 'medium'] || '#6366f1';
    const statusLabel = STATUS_LABELS[p.status || ''] || p.status || '';
    const phaseLabel = p.phase ? (PHASE_LABELS[p.phase] || p.phase) : '';

    const subjects: Record<NotificationType, string> = {
      task_assigned:       `[PM] You've been assigned: ${p.taskTitle}`,
      task_updated:        `[PM] Task updated: ${p.taskTitle}`,
      task_completed:      `[PM] Task completed: ${p.taskTitle}`,
      task_review:         `[PM] Ready for review: ${p.taskTitle}`,
      comment_added:       `[PM] New comment on: ${p.taskTitle}`,
      phase_task_created:  `[PM] New ${phaseLabel} task: ${p.taskTitle}`,
    };

    const bodies: Record<NotificationType, string> = {
      task_assigned: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p><strong>${p.actorName || 'A team member'}</strong> has assigned you to a task.</p>`,
      task_updated: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>Your task has been updated by <strong>${p.actorName || 'a team member'}</strong>.
        ${statusLabel ? `New status: <strong>${statusLabel}</strong>.` : ''}</p>`,
      task_completed: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>Your task has been marked <strong>Done</strong> by <strong>${p.actorName || 'a team member'}</strong>. Great work!</p>`,
      task_review: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>A task needs your review. <strong>${p.actorName || 'A team member'}</strong> moved it to the Review stage.</p>`,
      comment_added: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p><strong>${p.actorName || 'A team member'}</strong> left a comment:</p>
        <blockquote style="border-left:3px solid #6366f1;padding:10px 16px;color:#4b5563;margin:12px 0;background:#f8fafc;border-radius:0 8px 8px 0;">${p.comment || ''}</blockquote>`,
      phase_task_created: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>A new <strong>${phaseLabel}</strong> task has been created by <strong>${p.actorName || 'a team member'}</strong>. It may be relevant to your work.</p>`,
    };

    const html = this.wrapEmail(`
      ${bodies[p.type]}
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <h2 style="margin:0;font-size:16px;color:#1e293b;font-weight:600;">${p.taskTitle}</h2>
          <span style="background:${priorityColor}20;color:${priorityColor};font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;">${p.priority || 'medium'}</span>
        </div>
        ${p.taskDescription ? `<p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.5;">${p.taskDescription}</p>` : ''}
        <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:16px;">
          ${p.projectName ? `<div><span style="font-size:11px;color:#94a3b8;display:block;">PROJECT</span><span style="font-size:13px;color:#475569;font-weight:500;">${p.projectName}</span></div>` : ''}
          ${statusLabel ? `<div><span style="font-size:11px;color:#94a3b8;display:block;">STATUS</span><span style="font-size:13px;color:#475569;font-weight:500;">${statusLabel}</span></div>` : ''}
          ${phaseLabel ? `<div><span style="font-size:11px;color:#94a3b8;display:block;">PHASE</span><span style="font-size:13px;color:#475569;font-weight:500;">${phaseLabel}</span></div>` : ''}
          ${p.dueDate ? `<div><span style="font-size:11px;color:#94a3b8;display:block;">DUE</span><span style="font-size:13px;color:#475569;font-weight:500;">${new Date(p.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>` : ''}
        </div>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">View Task →</a>
      </div>
    `);

    return { subject: subjects[p.type], html };
  }

  private wrapEmail(body: string): string {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;">
      <span style="color:#fff;font-size:18px;font-weight:700;">📋 Project Manager</span>
      <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;">Team Collaboration Platform</p>
    </td>
  </tr>
  <tr><td style="padding:28px 32px;font-size:14px;color:#374151;line-height:1.6;">${body}</td></tr>
  <tr>
    <td style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by Project Manager · You can manage notifications in account settings.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
  }
}
