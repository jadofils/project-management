import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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
  tempPassword: string;
}

export interface CustomMailPayload {
  to: string | string[];
  subject: string;
  body: string;
  senderName?: string;
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

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER || 'jasezikeye50@gmail.com',
        pass: process.env.MAIL_PASS || 'hykr lozy krbt tvjd',
      },
    });
  }

  private get from() {
    return `"Project Manager" <${process.env.MAIL_USER || 'jasezikeye50@gmail.com'}>`;
  }

  private async deliver(to: string | string[], subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      const count = Array.isArray(to) ? to.length : 1;
      this.logger.log(`Email sent "${subject}" → ${count} recipient(s)`);
    } catch (err) {
      this.logger.error(`Failed to send email: ${(err as Error).message}`);
    }
  }

  // ── Task notifications ────────────────────────────────────────────────────
  async send(payload: TaskMailPayload): Promise<void> {
    const { subject, html } = this.buildTaskEmail(payload);
    await this.deliver(payload.to, subject, html);
  }

  // ── Invitation email ──────────────────────────────────────────────────────
  async sendInvitation(payload: InvitationPayload): Promise<void> {
    const appUrl = process.env.FRONTEND_URL || 'https://project-management-nine-roan.vercel.app';
    const subject = `You've been invited to Project Manager`;
    const html = this.wrapEmail(`
      <p>Hi <strong>${payload.recipientName}</strong>,</p>
      <p><strong>${payload.inviterName}</strong> has created an account for you on <strong>Project Manager</strong> — your team's project tracking system.</p>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin:20px 0;">
        <h3 style="margin:0 0 14px;font-size:15px;color:#0369a1;">Your Login Credentials</h3>
        <table>
          <tr><td style="color:#64748b;font-size:13px;padding-bottom:6px;width:80px;">Email</td><td style="font-weight:600;font-size:13px;">${payload.to}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;">Password</td><td style="font-weight:600;font-size:13px;font-family:monospace;">${payload.tempPassword}</td></tr>
        </table>
      </div>

      <p style="font-size:13px;color:#64748b;">Please log in and change your password as soon as possible.</p>

      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;">Go to Project Manager →</a>
      </div>
    `);
    await this.deliver(payload.to, subject, html);
  }

  // ── Custom / bulk email ───────────────────────────────────────────────────
  async sendCustom(payload: CustomMailPayload): Promise<void> {
    const senderLabel = payload.senderName ? ` from <strong>${payload.senderName}</strong>` : '';
    const html = this.wrapEmail(`
      <p>You have received a message${senderLabel}:</p>
      <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:16px 20px;border-radius:0 10px 10px 0;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#1e293b;white-space:pre-line;line-height:1.7;">${payload.body}</p>
      </div>
    `);
    await this.deliver(payload.to, payload.subject, html);
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
