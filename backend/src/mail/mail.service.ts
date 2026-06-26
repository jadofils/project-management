import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'task_review'
  | 'comment_added';

export interface MailPayload {
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
  taskUrl?: string;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Under Review', done: 'Done',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a',
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

  async send(payload: MailPayload): Promise<void> {
    try {
      const { subject, html } = this.buildEmail(payload);
      await this.transporter.sendMail({
        from: `"Project Manager" <${process.env.MAIL_USER || 'jasezikeye50@gmail.com'}>`,
        to: payload.to,
        subject,
        html,
      });
      this.logger.log(`Email sent [${payload.type}] → ${payload.to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${payload.to}:`, (err as Error).message);
    }
  }

  private buildEmail(p: MailPayload): { subject: string; html: string } {
    const appUrl = process.env.FRONTEND_URL || 'https://project-management-nine-roan.vercel.app';
    const taskUrl = p.taskUrl || appUrl;
    const priorityColor = PRIORITY_COLORS[p.priority || 'medium'] || '#6366f1';
    const statusLabel = STATUS_LABELS[p.status || ''] || p.status || '';

    const subjects: Record<NotificationType, string> = {
      task_assigned:   `[PM] You've been assigned: ${p.taskTitle}`,
      task_updated:    `[PM] Task updated: ${p.taskTitle}`,
      task_completed:  `[PM] Task completed: ${p.taskTitle}`,
      task_review:     `[PM] Task ready for review: ${p.taskTitle}`,
      comment_added:   `[PM] New comment on: ${p.taskTitle}`,
    };

    const bodies: Record<NotificationType, string> = {
      task_assigned: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>You have been assigned a new task by <strong>${p.actorName || 'a team member'}</strong>.</p>
      `,
      task_updated: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>A task you're involved with has been updated by <strong>${p.actorName || 'a team member'}</strong>.</p>
        ${statusLabel ? `<p>New status: <strong>${statusLabel}</strong></p>` : ''}
      `,
      task_completed: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>Great news! The task has been marked as <strong>Done</strong> by <strong>${p.actorName || 'a team member'}</strong>.</p>
      `,
      task_review: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p>A task is ready for your review. <strong>${p.actorName || 'A team member'}</strong> has moved it to the Review stage.</p>
      `,
      comment_added: `
        <p>Hi <strong>${p.recipientName}</strong>,</p>
        <p><strong>${p.actorName || 'A team member'}</strong> left a comment on your task:</p>
        <blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#4b5563;margin:12px 0;">${p.comment || ''}</blockquote>
      `,
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
            <table width="100%"><tr>
              <td>
                <div style="display:inline-flex;align-items:center;gap:10px;">
                  <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-block;text-align:center;line-height:36px;font-size:18px;">📋</div>
                  <span style="color:#fff;font-size:18px;font-weight:700;vertical-align:middle;margin-left:8px;">Project Manager</span>
                </div>
                <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Task Notification</p>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            ${bodies[p.type]}

            <!-- Task Card -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <h2 style="margin:0 0 8px;font-size:16px;color:#1e293b;font-weight:600;">${p.taskTitle}</h2>
                <span style="background:${priorityColor}20;color:${priorityColor};font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.5px;">${p.priority || 'medium'}</span>
              </div>
              ${p.taskDescription ? `<p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.5;">${p.taskDescription}</p>` : ''}
              <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:16px;">
                ${p.projectName ? `<div><span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">PROJECT</span><span style="font-size:13px;color:#475569;font-weight:500;">${p.projectName}</span></div>` : ''}
                ${statusLabel ? `<div><span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">STATUS</span><span style="font-size:13px;color:#475569;font-weight:500;">${statusLabel}</span></div>` : ''}
                ${p.dueDate ? `<div><span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">DUE DATE</span><span style="font-size:13px;color:#475569;font-weight:500;">${new Date(p.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>` : ''}
              </div>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-top:24px;">
              <a href="${taskUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;">View Task →</a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">This notification was sent by Project Manager. You can manage your notifications in your account settings.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { subject: subjects[p.type], html };
  }
}
