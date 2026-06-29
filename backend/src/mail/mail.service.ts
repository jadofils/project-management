import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { EmailLog } from '../database/entities';

export type NotificationType =
  | 'task_assigned' | 'task_updated' | 'task_completed'
  | 'task_review' | 'comment_added' | 'phase_task_created';

export interface TaskMailPayload {
  to: string; recipientName: string; type: NotificationType;
  taskTitle: string; taskDescription?: string; projectName?: string;
  status?: string; priority?: string; dueDate?: string;
  actorName?: string; comment?: string; phase?: string;
  project_id?: string; task_id?: string; imageUrls?: string[];
}

export interface InvitationPayload {
  to: string; recipientName: string; inviterName: string; tempPassword?: string;
}

export interface CustomMailPayload {
  to: string | string[]; subject: string; body: string; senderName?: string; project_id?: string;
}

const STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Under Review', done: 'Done' };
const PRIORITY_COLORS: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' };
const PHASE_LABELS: Record<string, string> = { backend: 'Backend', frontend: 'Frontend', documentation: 'Documentation', qa_testing: 'QA Testing', data_analyst: 'Data Analysis' };

const ICONS: Record<string, string> = {
  logo: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="white" fill-opacity="0.2"/><path d="M4 8h4v4H4V8zm6 0h4v4h-4V8zm6 0h4v4h-4V8zM4 14h4v4H4v-4zm6 0h4v4h-4v-4z" fill="white" opacity="0.9"/></svg>`,
  calendar: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#16a34a" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clock: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3.5L10.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  mail: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 4l6 4.5L14 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  flag: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2v12M3 2h9l-2.5 4L12 10H3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  lock: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 7V4.5a3 3 0 116 0V7" stroke="currentColor" stroke-width="1.5"/></svg>`,
  star: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.8 4.2 4.5.5-3.3 2.9.9 4.4L8 11.5l-3.9 2 .9-4.4L1.7 6.2l4.5-.5L8 1.5z" stroke="#f59e0b" stroke-width="1.5" fill="#fef3c7"/></svg>`,
  arrow: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(@InjectRepository(EmailLog) private emailLogs: Repository<EmailLog>) {
    const mailUser = process.env.MAIL_USER;
    const mailPass = process.env.MAIL_PASS;
    if (!mailUser || !mailPass) { this.logger.warn('MAIL_USER or MAIL_PASS not set — email sending disabled'); this.transporter = null!; return; }
    this.transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: { user: mailUser, pass: mailPass } });
  }

  private get from() { const u = process.env.MAIL_USER; return u ? `"ipfundo" <${u}>` : ''; }

  private async logEmail(opts: { type: string; sender_id?: string; recipient: string; subject: string; project_id?: string; related_id?: string; status: 'sent' | 'failed'; error_message?: string }) {
    try { await this.emailLogs.save(this.emailLogs.create({ ...opts, sender_id: opts.sender_id || null, project_id: opts.project_id || null, related_id: opts.related_id || null, error_message: opts.error_message || null } as any)); } catch {}
  }

  private async deliver(to: string | string[], subject: string, html: string, meta?: { type?: string; sender_id?: string; project_id?: string; related_id?: string }) {
    if (!this.transporter) { this.logger.warn(`Email skipped: "${subject}"`); return; }
    const recipients = Array.isArray(to) ? to : [to];
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Sent "${subject}" → ${recipients.length} recipient(s)`);
      for (const r of recipients) this.logEmail({ type: meta?.type || 'generic', sender_id: meta?.sender_id, recipient: r, subject, project_id: meta?.project_id, related_id: meta?.related_id, status: 'sent' });
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Failed: "${subject}" — ${msg}`);
      for (const r of recipients) this.logEmail({ type: meta?.type || 'generic', sender_id: meta?.sender_id, recipient: r, subject, project_id: meta?.project_id, related_id: meta?.related_id, status: 'failed', error_message: msg });
    }
  }

  // ── Digest queue — batch task emails per recipient within 10 s ───────────
  private readonly digestQueue = new Map<string, { tasks: TaskMailPayload[]; timer: ReturnType<typeof setTimeout> }>();
  private readonly DIGEST_DELAY = 10_000;

  async send(payload: TaskMailPayload) {
    const batchTypes: NotificationType[] = ['task_assigned', 'task_updated', 'task_completed', 'phase_task_created'];
    if (batchTypes.includes(payload.type)) {
      this.queueDigest(payload);
      return;
    }
    // comment / review send immediately
    const { subject, html } = this.buildTaskEmail(payload);
    await this.deliver(payload.to, subject, html, { type: payload.type });
  }

  private queueDigest(payload: TaskMailPayload) {
    const existing = this.digestQueue.get(payload.to);
    if (existing) {
      clearTimeout(existing.timer);
      existing.tasks.push(payload);
      existing.timer = setTimeout(() => this.flushDigest(payload.to), this.DIGEST_DELAY);
    } else {
      const timer = setTimeout(() => this.flushDigest(payload.to), this.DIGEST_DELAY);
      this.digestQueue.set(payload.to, { tasks: [payload], timer });
    }
  }

  private async flushDigest(email: string) {
    const queue = this.digestQueue.get(email);
    if (!queue) return;
    this.digestQueue.delete(email);
    if (queue.tasks.length === 1) {
      const { subject, html } = this.buildTaskEmail(queue.tasks[0]);
      await this.deliver(email, subject, html, { type: queue.tasks[0].type });
      return;
    }
    const recipientName = queue.tasks[0].recipientName;
    const subject = `[ipfundo] ${queue.tasks.length} task updates for you`;
    const html = this.buildDigestEmail(recipientName, queue.tasks);
    await this.deliver(email, subject, html, { type: 'task_digest' });
  }

  async sendProjectInviteNew(opts: { to: string; inviterName: string; projectName: string; role: string; token: string; expiresAt: Date; project_id?: string; sender_id?: string; invitation_id?: string }) {
    const appUrl = process.env.FRONTEND_URL || '';
    const link = `${appUrl}?invite=${opts.token}`;
    const expiry = opts.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const html = this.wrap(`
      <table width="100%" style="margin-bottom:24px"><tr>
        <td style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center">
          <span style="display:inline-block;width:48px;height:48px;background:#16a34a;border-radius:50%;line-height:48px;color:white;font-size:20px;font-weight:700">+</span>
          <h2 style="margin:12px 0 4px;font-size:18px;color:#166534">Project Invitation</h2>
          <p style="margin:0;font-size:13px;color:#4ade80">You've been invited to collaborate</p>
        </td></tr></table>
      <p style="font-size:14px;color:#374151;line-height:1.7">Hi there,</p>
      <p style="font-size:14px;color:#374151;line-height:1.7"><strong style="color:#4f46e5">${opts.inviterName}</strong> has invited you to join <strong style="color:#1e293b">${opts.projectName}</strong> as a <strong>${opts.role.replace(/_/g, ' ')}</strong>.</p>
      ${this.button(link, 'Accept Invitation')}
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:600">INVITATION DETAILS</p>
        <table width="100%" style="font-size:13px;color:#475569">
          <tr><td style="padding:3px 0;color:#94a3b8;width:70px">Project</td><td style="font-weight:500">${opts.projectName}</td></tr>
          <tr><td style="padding:3px 0;color:#94a3b8">Role</td><td style="font-weight:500;text-transform:capitalize">${opts.role.replace(/_/g, ' ')}</td></tr>
          <tr><td style="padding:3px 0;color:#94a3b8">Expires</td><td style="font-weight:500">${expiry}</td></tr>
        </table>
      </div>
    `);
    await this.deliver(opts.to, `You're invited to join ${opts.projectName}`, html, { type: 'invitation_new', sender_id: opts.sender_id, project_id: opts.project_id, related_id: opts.invitation_id });
  }

  async sendProjectAddedNotification(opts: { to: string; recipientName: string; inviterName: string; projectName: string; role: string; appUrl?: string; project_id?: string; sender_id?: string }) {
    const url = opts.appUrl || process.env.FRONTEND_URL || '';
    const html = this.wrap(`
      <p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${opts.recipientName}</strong>,</p>
      <p style="font-size:14px;color:#374151;line-height:1.7"><strong style="color:#4f46e5">${opts.inviterName}</strong> has added you to the project <strong style="color:#1e293b">${opts.projectName}</strong> as a <strong>${opts.role.replace(/_/g, ' ')}</strong>.</p>
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:16px;margin:20px 0;text-align:center">
        <p style="margin:0 0 4px;font-size:13px;color:#4338ca">You now have access to this project</p>
        <p style="margin:0;font-size:12px;color:#6366f1">All tasks, chat, and project resources are available from your dashboard.</p>
      </div>
      ${this.button(url, 'Open Project Manager')}
    `);
    await this.deliver(opts.to, `You've been added to ${opts.projectName}`, html, { type: 'invitation_existing', sender_id: opts.sender_id, project_id: opts.project_id });
  }

  async sendInvitation(payload: InvitationPayload) {
    const appUrl = process.env.FRONTEND_URL || '';
    const passBlock = payload.tempPassword ? `
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:20px;margin:20px 0;text-align:center">
        <p style="margin:0 0 8px;font-size:12px;color:#a16207;font-weight:600;letter-spacing:0.5px">TEMPORARY PASSWORD</p>
        <div style="background:white;border:1px dashed #fde68a;border-radius:8px;padding:12px;display:inline-block;min-width:180px">
          <code style="font-size:18px;font-weight:700;color:#854d0e;letter-spacing:2px;font-family:'Courier New',monospace">${payload.tempPassword}</code>
        </div>
        <p style="margin:8px 0 0;font-size:11px;color:#a16207">You'll be asked to change this on first login.</p>
      </div>
    ` : `<p style="font-size:13px;color:#64748b;margin:20px 0">Please contact <strong>${payload.inviterName}</strong> for your login credentials.</p>`;
    const html = this.wrap(`
      <table width="100%" style="margin-bottom:24px"><tr>
        <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:20px;text-align:center">
          <p style="color:white;font-size:20px;font-weight:700;margin:0">Welcome to ProManager</p>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">Your team collaboration platform</p>
        </td></tr></table>
      <p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${payload.recipientName}</strong>,</p>
      <p style="font-size:14px;color:#374151;line-height:1.7"><strong style="color:#4f46e5">${payload.inviterName}</strong> has created an account for you on ProManager — your team's project management platform.</p>
      ${passBlock}
      ${this.button(appUrl, 'Go to ProManager')}
    `);
    await this.deliver(payload.to, 'Welcome to ProManager — Your Account is Ready', html, { type: 'welcome' });
  }

  async sendCustom(payload: CustomMailPayload, sender_id?: string) {
    const senderLabel = payload.senderName ? ` from <strong>${payload.senderName}</strong>` : '';
    const html = this.wrap(`
      <p style="font-size:14px;color:#374151;line-height:1.7">You have received a message${senderLabel}:</p>
      <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:16px 20px;border-radius:0 10px 10px 0;margin:16px 0"><p style="margin:0;font-size:14px;color:#1e293b;white-space:pre-line;line-height:1.7">${payload.body}</p></div>
    `);
    for (const r of Array.isArray(payload.to) ? payload.to : [payload.to]) await this.deliver(r, payload.subject, html, { type: 'custom', sender_id, project_id: payload.project_id });
  }

  // ── Digest email builder ──────────────────────────────────────────────────
  private buildDigestEmail(recipientName: string, tasks: TaskMailPayload[]): string {
    const appUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const taskRows = tasks.map(t => {
      const priorityColor = PRIORITY_COLORS[t.priority || 'medium'] || '#6366f1';
      const taskUrl = t.project_id ? `${appUrl}?project=${t.project_id}` : appUrl;
      const label: Record<NotificationType, string> = {
        task_assigned: 'Assigned to you', task_updated: 'Updated', task_completed: 'Completed',
        task_review: 'Ready for review', comment_added: 'New comment', phase_task_created: 'New task',
      };
      const desc = t.taskDescription
        ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.5">${t.taskDescription}</p>`
        : '';
      return `<tr>
        <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top">
          <table width="100%"><tr>
            <td style="vertical-align:top">
              <p style="margin:0;font-size:13px;font-weight:600;color:#1e293b">${t.taskTitle}</p>
              ${desc}
              ${t.projectName ? `<p style="margin:4px 0 0;font-size:11px;color:#94a3b8">${t.projectName}</p>` : ''}
            </td>
            <td style="text-align:right;vertical-align:top;white-space:nowrap;padding-left:12px">
              <span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;background:${priorityColor}18;color:${priorityColor};text-transform:uppercase">${t.priority || 'medium'}</span><br>
              <span style="font-size:10px;color:#94a3b8;display:inline-block;margin-top:3px">${label[t.type]}</span><br>
              <a href="${taskUrl}" style="font-size:10px;color:#4f46e5;text-decoration:none;font-weight:500">View →</a>
            </td>
          </tr></table>
        </td></tr>`;
    }).join('');

    return this.wrap(`
      <p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${recipientName}</strong>,</p>
      <p style="font-size:14px;color:#374151;line-height:1.7">You have <strong style="color:#4f46e5">${tasks.length} task updates</strong> waiting for your attention:</p>
      <table width="100%" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:20px 0;border-spacing:0">
        ${taskRows}
      </table>
      ${this.button(appUrl, 'Open Project Manager')}
    `);
  }

  // ── Task email builder ────────────────────────────────────────────────────
  private buildTaskEmail(p: TaskMailPayload): { subject: string; html: string } {
    const appUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const priorityColor = PRIORITY_COLORS[p.priority || 'medium'] || '#6366f1';
    const statusLabel = STATUS_LABELS[p.status || ''] || p.status || '';
    const phaseLabel = p.phase ? (PHASE_LABELS[p.phase] || p.phase) : '';

    const subjects: Record<NotificationType, string> = {
      task_assigned: `[ProManager] Assigned: ${p.taskTitle}`,
      task_updated: `[ProManager] Updated: ${p.taskTitle}`,
      task_completed: `[ProManager] Completed: ${p.taskTitle}`,
      task_review: `[ProManager] Ready for review: ${p.taskTitle}`,
      comment_added: `[ProManager] New comment: ${p.taskTitle}`,
      phase_task_created: `[ProManager] New ${phaseLabel} task: ${p.taskTitle}`,
    };

    const icons: Record<NotificationType, string> = {
      task_assigned: 'user', task_updated: 'flag', task_completed: 'check',
      task_review: 'star', comment_added: 'mail', phase_task_created: 'clock',
    };
    const iconColors: Record<string, string> = {
      user: '#6366f1', flag: '#ea580c', check: '#16a34a', star: '#f59e0b', mail: '#6366f1', clock: '#7c3aed',
    };
    const labels: Record<NotificationType, string> = {
      task_assigned: 'Task Assigned', task_updated: 'Task Updated', task_completed: 'Task Completed',
      task_review: 'Ready for Review', comment_added: 'New Comment', phase_task_created: 'Phase Task Created',
    };

    const icon = icons[p.type];
    const iconColor = iconColors[icon];

    const bodyTexts: Record<NotificationType, string> = {
      task_assigned: `<p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${p.recipientName}</strong>,</p><p style="font-size:14px;color:#374151;line-height:1.7"><strong style="color:#4f46e5">${p.actorName || 'A team member'}</strong> has assigned you to a task.</p>`,
      task_updated: `<p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${p.recipientName}</strong>,</p><p style="font-size:14px;color:#374151;line-height:1.7">Your task was updated by <strong style="color:#4f46e5">${p.actorName || 'a team member'}</strong>${statusLabel ? ` — now <strong>${statusLabel}</strong>` : ''}.</p>`,
      task_completed: `<p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${p.recipientName}</strong>,</p><p style="font-size:14px;color:#374151;line-height:1.7">Your task has been marked <strong style="color:#16a34a">Done</strong> by <strong style="color:#4f46e5">${p.actorName || 'a team member'}</strong>. Great work!</p>`,
      task_review: `<p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${p.recipientName}</strong>,</p><p style="font-size:14px;color:#374151;line-height:1.7">A task needs your review. <strong style="color:#4f46e5">${p.actorName || 'A team member'}</strong> moved it to the Review stage.</p>`,
      comment_added: `<p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${p.recipientName}</strong>,</p><p style="font-size:14px;color:#374151;line-height:1.7"><strong style="color:#4f46e5">${p.actorName || 'A team member'}</strong> left a comment:</p><blockquote style="border-left:4px solid #6366f1;padding:12px 16px;color:#4b5563;margin:12px 0;background:#f8fafc;border-radius:0 8px 8px 0;font-style:italic">${p.comment || ''}</blockquote>`,
      phase_task_created: `<p style="font-size:14px;color:#374151;line-height:1.7">Hi <strong>${p.recipientName}</strong>,</p><p style="font-size:14px;color:#374151;line-height:1.7">A new <strong>${phaseLabel}</strong> task has been created by <strong style="color:#4f46e5">${p.actorName || 'a team member'}</strong>. It may be relevant to your work.</p>`,
    };

    const taskUrl = p.project_id ? `${appUrl}?project=${p.project_id}` : appUrl;

    const imagesBlock = p.imageUrls?.length
      ? `<div style="margin:16px 0">
          <p style="font-size:11px;color:#64748b;font-weight:600;letter-spacing:0.4px;margin:0 0 8px">ATTACHMENTS (${p.imageUrls.length})</p>
          <table><tr>${p.imageUrls.slice(0, 4).map(url =>
            `<td style="padding:0 6px 0 0"><a href="${url}" target="_blank"><img src="${url}" alt="screenshot" style="width:120px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block"/></a></td>`
          ).join('')}</tr></table>
          ${p.imageUrls.length > 4 ? `<p style="margin:6px 0 0;font-size:11px;color:#94a3b8">+${p.imageUrls.length - 4} more attachment(s)</p>` : ''}
        </div>`
      : '';

    const html = this.wrap(`
      <table width="100%" style="margin-bottom:20px"><tr>
        <td style="border-radius:12px;padding:16px 20px;background:${iconColor}10;border:1px solid ${iconColor}30">
          <table width="100%"><tr>
            <td style="vertical-align:middle;padding-right:12px">
              <span style="display:inline-flex;width:36px;height:36px;background:${iconColor};border-radius:10px;align-items:center;justify-content:center"><span style="color:white;line-height:1;font-weight:700;font-size:16px">${icon === 'user' ? '☷' : icon === 'flag' ? '⚑' : icon === 'check' ? '✓' : icon === 'star' ? '★' : icon === 'mail' ? '✉' : '⏱'}</span></span>
            </td>
            <td>
              <p style="margin:0;font-size:15px;font-weight:700;color:${iconColor}">${labels[p.type]}</p>
              ${p.projectName ? `<p style="margin:2px 0 0;font-size:11px;color:#64748b">${p.projectName}</p>` : ''}
            </td>
          </tr></table>
        </td></tr></table>
      ${bodyTexts[p.type]}
      <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0">
        <table width="100%">
          <tr><td colspan="2" style="padding-bottom:10px">
            <strong style="font-size:16px;color:#1e293b;line-height:1.4">${p.taskTitle}</strong>
          </td></tr>
          <tr>
            <td style="width:50%;padding-bottom:12px"><span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;background:${priorityColor}18;color:${priorityColor};text-transform:uppercase;letter-spacing:0.5px">${p.priority || 'medium'}</span></td>
            <td style="width:50%;padding-bottom:12px;text-align:right">${statusLabel ? `<span style="font-size:11px;color:#64748b;font-weight:500;background:#f8fafc;border:1px solid #e2e8f0;padding:3px 8px;border-radius:6px">${statusLabel}</span>` : ''}</td>
          </tr>
          ${p.taskDescription ? `<tr><td colspan="2" style="padding-bottom:12px">
            <div style="background:#f8fafc;border-left:3px solid ${iconColor};padding:10px 14px;border-radius:0 8px 8px 0">
              <p style="margin:0 0 3px;font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.4px;text-transform:uppercase">Description</p>
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.6">${p.taskDescription}</p>
            </div>
          </td></tr>` : ''}
          <tr><td colspan="2">
            <table width="100%" style="font-size:11px;color:#94a3b8">
              <tr>
                ${phaseLabel ? `<td><span style="color:#64748b;font-weight:500">${phaseLabel}</span></td>` : '<td></td>'}
                ${p.dueDate ? `<td style="text-align:right"><span style="color:#64748b;font-weight:500">Due ${new Date(p.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></td>` : '<td></td>'}
              </tr>
            </table>
          </td></tr>
        </table>
      </div>
      ${imagesBlock}
      ${this.button(taskUrl, 'Open in Project Manager')}
    `);
    return { subject: subjects[p.type], html };
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  private wrap(body: string): string {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>a:hover{opacity:0.9}</style></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)">
  <tr><td style="background:#4f46e5;padding:20px 28px">
    <table width="100%"><tr>
      <td style="color:white;font-size:16px;font-weight:700;letter-spacing:-0.3px">ipfundo</td>
      <td style="text-align:right;color:rgba(255,255,255,0.65);font-size:11px">Team Collaboration</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 28px">${body}</td></tr>
  <tr><td style="padding:20px 28px;border-top:1px solid #f1f5f9;background:#fafbfc">
    <table width="100%"><tr>
      <td style="color:#94a3b8;font-size:11px;line-height:1.6">ipfundo — Team Collaboration Platform<br>You received this email because you are a member of a project on ipfundo.</td>
      <td style="text-align:right;vertical-align:bottom"><span style="background:#e2e8f0;color:#64748b;font-size:10px;padding:3px 8px;border-radius:6px;font-weight:600">AUTO NOTIFICATION</span></td>
    </tr></table>
  </td></tr>
</table>
</td></tr></table></body></html>`;
  }

  private button(url: string, label: string): string {
    return `<table width="100%" style="margin:24px 0"><tr><td align="center">
      <a href="${url}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:13px 36px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.2px">${label} &rarr;</a>
    </td></tr></table>`;
  }
}
