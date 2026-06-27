import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { ProjectInvitation, ProjectMember, Project, User } from '../database/entities';
import { MailService } from '../mail/mail.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(ProjectInvitation) private invitations: Repository<ProjectInvitation>,
    @InjectRepository(ProjectMember)     private members:     Repository<ProjectMember>,
    @InjectRepository(Project)           private projects:    Repository<Project>,
    @InjectRepository(User)              private users:       Repository<User>,
    private mail: MailService,
  ) {}

  // ── Invite by email (PM or Admin) ─────────────────────────────────────────
  async invite(
    projectId: string,
    invitedById: string,
    dto: { email: string; role: string; permission_level?: string },
  ) {
    const [project, inviter] = await Promise.all([
      this.projects.findOne({ where: { id: projectId } }),
      this.users.findOne({ where: { id: invitedById } }),
    ]);
    if (!project) throw new NotFoundException('Project not found');
    if (!inviter)  throw new NotFoundException('Inviter not found');

    const email      = dto.email.toLowerCase().trim();
    const role       = dto.role || 'backend_dev';
    const permLevel  = dto.permission_level || 'editor';
    const inviterName = `${inviter.first_name} ${inviter.last_name}`.trim();

    const existingUser = await this.users.findOne({ where: { email } });

    if (existingUser) {
      // Already member?
      const isMember = await this.members.findOne({ where: { project_id: projectId, user_id: existingUser.id } });
      if (isMember) throw new ConflictException('User is already a member of this project');

      // Add directly
      const m = this.members.create({ project_id: projectId, user_id: existingUser.id, role: role as any, roles: [role] as any, permission_level: permLevel } as any);
      await this.members.save(m);

      // Notify them
      this.mail.sendProjectAddedNotification({
        to:            existingUser.email,
        recipientName: `${existingUser.first_name} ${existingUser.last_name}`.trim(),
        inviterName,
        projectName:   project.name,
        role,
        project_id:    projectId,
        sender_id:     invitedById,
      }).catch(e => this.logger.error('Add notification failed', e));

      return {
        status:    'added',
        message:   `${existingUser.first_name} ${existingUser.last_name} was added to the project`,
        userExists: true,
        user:      this.sanitize(existingUser),
      };
    }

    // Check for existing pending invitation
    const existingInv = await this.invitations.findOne({ where: { project_id: projectId, email, status: 'pending' } });
    if (existingInv) {
      // Resend
      const expiresAt = existingInv.expires_at || new Date(Date.now() + 7 * 86_400_000);
      this.mail.sendProjectInviteNew({
        to: email, inviterName, projectName: project.name, role, token: existingInv.token, expiresAt,
        project_id: projectId, sender_id: invitedById, invitation_id: existingInv.id,
      }).catch(e => this.logger.error('Invite resend failed', e));
      return { status: 'resent', message: `Invitation resent to ${email}`, userExists: false };
    }

    // Create invitation
    const token     = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 86_400_000); // 7 days

    const inv = this.invitations.create({
      project_id:       projectId,
      invited_by:       invitedById,
      email,
      role,
      permission_level: permLevel,
      token,
      status:           'pending',
      expires_at:       expiresAt,
    } as any) as unknown as ProjectInvitation;
    await this.invitations.save(inv);

    // Send invitation email
    this.mail.sendProjectInviteNew({
      to: email, inviterName, projectName: project.name, role, token, expiresAt,
      project_id: projectId, sender_id: invitedById, invitation_id: inv.id,
    }).catch(e => this.logger.error('Invite email failed', e));

    return { status: 'invited', message: `Invitation sent to ${email}`, userExists: false };
  }

  // ── List pending invitations for a project ────────────────────────────────
  async listForProject(projectId: string) {
    try {
      const data = await this.invitations.find({
        where: { project_id: projectId },
        order: { created_at: 'DESC' },
      });
      const invitedByIds = [...new Set(data.map(inv => inv.invited_by).filter(Boolean))] as string[];
      const users = invitedByIds.length ? await this.users.find({ where: { id: In(invitedByIds) }, select: ['id', 'first_name', 'last_name'] }) : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      return data.map(inv => ({
        ...inv,
        invited_by_name: inv.invited_by ? `${userMap[inv.invited_by]?.first_name || ''} ${userMap[inv.invited_by]?.last_name || ''}`.trim() : null,
        accepted_by_name: null,
      }));
    } catch {
      return [];
    }
  }

  // ── Cancel invitation ─────────────────────────────────────────────────────
  async cancel(invitationId: string, projectId: string) {
    const inv = await this.invitations.findOne({ where: { id: invitationId, project_id: projectId } });
    if (!inv) throw new NotFoundException('Invitation not found');
    inv.status = 'cancelled';
    await this.invitations.save(inv);
    return { ok: true };
  }

  // ── Get invitation details (public) ──────────────────────────────────────
  async getByToken(token: string) {
    const inv = await this.invitations.findOne({ where: { token } });
    if (!inv) throw new NotFoundException('Invitation not found or already used');
    if (inv.status !== 'pending') throw new BadRequestException(`Invitation is ${inv.status}`);
    if (inv.expires_at && inv.expires_at < new Date()) {
      inv.status = 'expired';
      await this.invitations.save(inv);
      throw new BadRequestException('Invitation has expired');
    }

    const [project, inviter] = await Promise.all([
      this.projects.findOne({ where: { id: inv.project_id } }),
      inv.invited_by ? this.users.findOne({ where: { id: inv.invited_by } }) : null,
    ]);

    const emailExists = !!(await this.users.findOne({ where: { email: inv.email } }));

    return {
      token:           inv.token,
      email:           inv.email,
      role:            inv.role,
      permission_level: inv.permission_level,
      project:         project ? { id: project.id, name: project.name, description: project.description } : null,
      inviterName:     inviter ? `${inviter.first_name} ${inviter.last_name}`.trim() : null,
      expiresAt:       inv.expires_at,
      emailExists,
    };
  }

  // ── Accept invitation (logged-in user) ───────────────────────────────────
  async accept(token: string, userId: string) {
    const inv = await this.invitations.findOne({ where: { token, status: 'pending' } });
    if (!inv) throw new NotFoundException('Invitation not found or already used');
    if (inv.expires_at && inv.expires_at < new Date()) throw new BadRequestException('Invitation has expired');

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Add to project
    const existing = await this.members.findOne({ where: { project_id: inv.project_id, user_id: userId } });
    if (!existing) {
      const m = this.members.create({ project_id: inv.project_id, user_id: userId, role: inv.role as any, roles: [inv.role] as any, permission_level: inv.permission_level } as any);
      await this.members.save(m);
    }

    inv.status = 'accepted';
    inv.accepted_by = userId;
    await this.invitations.save(inv);

    return { ok: true, project_id: inv.project_id };
  }

  // ── Register a new account via invitation link ────────────────────────────
  async registerAndAccept(token: string, dto: { first_name: string; last_name: string; password: string }) {
    const inv = await this.invitations.findOne({ where: { token, status: 'pending' } });
    if (!inv) throw new NotFoundException('Invitation not found or already used');
    if (inv.expires_at && inv.expires_at < new Date()) throw new BadRequestException('Invitation has expired');

    // If email already exists just accept
    const existingUser = await this.users.findOne({ where: { email: inv.email } });
    if (existingUser) {
      await this.accept(token, existingUser.id);
      return { user: this.sanitize(existingUser), token: this.sign(existingUser), project_id: inv.project_id };
    }

    // Create account
    const password_hash = await bcrypt.hash(dto.password, 10);
    const userEntity    = this.users.create({
      email:      inv.email,
      first_name: dto.first_name.trim(),
      last_name:  dto.last_name.trim(),
      password_hash,
      system_role: 'user',
      is_active:   true,
      must_change_password: false,
    } as any);
    const saved = await this.users.save(userEntity) as unknown as User;

    // Add to project
    const m = this.members.create({
      project_id: inv.project_id, user_id: saved.id,
      role: inv.role as any, roles: [inv.role] as any,
      permission_level: inv.permission_level,
    } as any);
    await this.members.save(m);

    inv.status = 'accepted';
    inv.accepted_by = saved.id;
    await this.invitations.save(inv);

    return { user: this.sanitize(saved), token: this.sign(saved), project_id: inv.project_id };
  }

  // ── Resend invitation ─────────────────────────────────────────────────────
  async resend(invitationId: string, projectId: string) {
    const inv = await this.invitations.findOne({ where: { id: invitationId, project_id: projectId } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.status !== 'pending') throw new BadRequestException(`Cannot resend — invitation is ${inv.status}`);

    const [project, inviter] = await Promise.all([
      this.projects.findOne({ where: { id: inv.project_id } }),
      inv.invited_by ? this.users.findOne({ where: { id: inv.invited_by } }) : null,
    ]);
    const inviterName = inviter ? `${inviter.first_name} ${inviter.last_name}`.trim() : 'A team member';

    inv.expires_at = new Date(Date.now() + 7 * 86_400_000);
    await this.invitations.save(inv);

    this.mail.sendProjectInviteNew({
      to: inv.email, inviterName, projectName: project?.name || '', role: inv.role,
      token: inv.token, expiresAt: inv.expires_at,
      project_id: inv.project_id, sender_id: inv.invited_by || undefined, invitation_id: inv.id,
    }).catch(e => this.logger.error('Resend email failed', e));

    return { ok: true, message: `Invitation resent to ${inv.email}` };
  }

  // ── Get all invitations (admin) ───────────────────────────────────────────
  async getAll(page = 1, limit = 50) {
    const [data, total] = await this.invitations.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const acceptedByIds = [...new Set(data.map(inv => inv.accepted_by).filter(Boolean))] as string[];
    const projectIds = [...new Set(data.map(inv => inv.project_id))];

    const [acceptedUsers, projectList] = await Promise.all([
      acceptedByIds.length ? this.users.find({ where: { id: In(acceptedByIds) }, select: ['id', 'first_name', 'last_name'] }) : [],
      projectIds.length ? this.projects.find({ where: { id: In(projectIds) }, select: ['id', 'name'] }) : [],
    ]);

    const userMap = Object.fromEntries(acceptedUsers.map(u => [u.id, u]));
    const projectMap = Object.fromEntries(projectList.map(p => [p.id, p]));

    return {
      data: data.map(inv => ({
        ...inv,
        project_name: projectMap[inv.project_id]?.name || '',
        accepted_by_name: inv.accepted_by ? `${userMap[inv.accepted_by]?.first_name || ''} ${userMap[inv.accepted_by]?.last_name || ''}`.trim() : null,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  private sign(user: User) {
    return jwt.sign(
      { sub: user.id, email: user.email, system_role: user.system_role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRATION || '7d') as any },
    );
  }

  private sanitize(u: User) {
    const { password_hash, ...rest } = u as any;
    return rest;
  }
}
