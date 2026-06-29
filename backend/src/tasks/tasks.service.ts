import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task, TaskAssignmentLog, User, Project, ProjectMember } from '../database/entities';
import { MailService } from '../mail/mail.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CloudinaryService } from '../common/cloudinary.service';

const PHASE_ROLES: Record<string, string[]> = {
  backend:        ['backend_dev'],
  frontend:       ['frontend_dev'],
  documentation:  ['documentalist'],
  qa_testing:     ['qa_tester', 'tester'],
  analysis:       ['analyst'],
  db_engineering: ['db_engineer'],
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)              private repo:    Repository<Task>,
    @InjectRepository(TaskAssignmentLog) private logs:    Repository<TaskAssignmentLog>,
    @InjectRepository(User)              private users:   Repository<User>,
    @InjectRepository(Project)           private projects: Repository<Project>,
    @InjectRepository(ProjectMember)     private members: Repository<ProjectMember>,
    private mail: MailService,
    private notifs: ChatGateway,
    private cloudinary: CloudinaryService,
  ) {}

  async getByProject(projectId: string) {
    return this.repo.find({ where: { project_id: projectId }, order: { sort_order: 'ASC' } });
  }

  async create(userId: string, dto: any) {
    // Only project managers may assign tasks to others on creation
    const requestedIds: string[] = dto.assignee_ids?.length ? dto.assignee_ids : (dto.assignee_id ? [dto.assignee_id] : []);
    const assigningToOthers = requestedIds.some(id => id !== userId);
    if (assigningToOthers) {
      const actor = await this.users.findOne({ where: { id: userId } });
      if (actor?.system_role !== 'admin') {
        const actorMember = await this.members.findOne({ where: { project_id: dto.project_id, user_id: userId } });
        const roles = (actorMember?.roles?.length ? actorMember.roles : [actorMember?.role]).filter(Boolean);
        const isManager = roles.includes('project_manager') || actorMember?.permission_level === 'manager';
        if (!isManager) {
          // Strip assignees — non-managers can only create tasks for themselves
          delete dto.assignee_ids;
          delete dto.assignee_id;
        }
      }
    }

    const count = await this.repo.count({ where: { project_id: dto.project_id, status: dto.status || 'todo' } });
    const payload = { ...dto, sort_order: count, created_by: userId };
    if (dto.due_date) payload.original_due_date = dto.due_date;
    const task = await this.repo.save(this.repo.create(payload as any)) as unknown as Task;

    const ids: string[] = task.assignee_ids?.length ? task.assignee_ids : (task.assignee_id ? [task.assignee_id] : []);
    const toNotify = ids.filter(id => id !== userId);

    // Log assignments on creation
    if (ids.length) {
      const logBase = { task_id: task.id, project_id: task.project_id, task_title: task.title, changed_by: userId };
      const logEntries = ids.map(uid => this.logs.create({ ...logBase, user_id: uid, action: 'assigned' } as any));
      await Promise.all(logEntries.map(e => this.logs.save(e))).catch(e => this.logger.error('Log save failed on create', e));
      // Notify assignees
      this.notifs.notifyUsers(ids, { type: 'task', title: 'Task Assigned', body: `You've been assigned to "${task.title}"`, project_id: task.project_id });
    }

    if (toNotify.length) {
      this.notifyMultiple(task, toNotify, userId, 'task_assigned').catch(e => this.logger.error('Notify failed', e));
    } else if (task.phase && PHASE_ROLES[task.phase]) {
      this.notifyPhaseGroup(task, userId).catch(e => this.logger.error('Phase notify failed', e));
    }
    return task;
  }

  async update(id: string, dto: any) {
    const before = await this.repo.findOne({ where: { id } });
    if (!before) throw new NotFoundException();

    // Only project managers (or admins) may reassign tasks
    const isChangingAssignees = 'assignee_ids' in dto || 'assignee_id' in dto;
    if (isChangingAssignees && dto._actor_id) {
      const actor = await this.users.findOne({ where: { id: dto._actor_id } });
      if (actor?.system_role !== 'admin') {
        const actorMember = await this.members.findOne({ where: { project_id: before.project_id, user_id: dto._actor_id } });
        const roles = (actorMember?.roles?.length ? actorMember.roles : [actorMember?.role]).filter(Boolean);
        const isManager = roles.includes('project_manager') || actorMember?.permission_level === 'manager';
        if (!isManager) {
          throw new ForbiddenException('Only project managers can assign tasks to team members');
        }
      }
    }

    const prevAssigneeIds = before.assignee_ids || (before.assignee_id ? [before.assignee_id] : []);
    const prevStatus      = before.status;
    const prevDueDate     = before.due_date;

    // Set completed_at + completed_by when task moves to done
    if (dto.status === 'done' && prevStatus !== 'done') {
      dto.completed_at = new Date();
      if (dto._actor_id) dto.completed_by = dto._actor_id;
    }
    // Clear completion fields if moved out of done
    if (prevStatus === 'done' && dto.status && dto.status !== 'done') {
      dto.completed_at = null;
      dto.completed_by = null;
    }
    // Preserve original_due_date (only set once on first due_date assignment)
    if (dto.due_date && !before.original_due_date) {
      dto.original_due_date = dto.due_date;
    }

    Object.assign(before, dto);
    const task = await this.repo.save(before);

    const actorId = dto._actor_id;
    const newIds: string[] = task.assignee_ids?.length ? task.assignee_ids : (task.assignee_id ? [task.assignee_id] : []);

    // Log assignment changes
    const addedIds   = newIds.filter(uid => !prevAssigneeIds.includes(uid));
    const removedIds = prevAssigneeIds.filter(uid => !newIds.includes(uid));

    const logBase = { task_id: task.id, project_id: task.project_id, task_title: task.title, changed_by: actorId || null };
    const logEntries: Partial<TaskAssignmentLog>[] = [
      ...addedIds.map(uid => ({ ...logBase, user_id: uid, action: 'assigned' })),
      ...removedIds.map(uid => ({ ...logBase, user_id: uid, action: 'unassigned' })),
    ];
    if (logEntries.length) {
      const entities = logEntries.map(e => this.logs.create(e as any));
      await Promise.all(entities.map(e => this.logs.save(e))).catch(e => this.logger.error('Log save failed', e));
    }

    // Notifications
    if (addedIds.length) {
      const toNotify = addedIds.filter(uid => uid !== actorId);
      if (toNotify.length) {
        this.notifyMultiple(task, toNotify, actorId, 'task_assigned').catch(e => this.logger.error('Notify failed', e));
        this.notifs.notifyUsers(toNotify, { type: 'task', title: 'Task Assigned', body: `You've been assigned to "${task.title}"`, project_id: task.project_id });
      }
    } else if (newIds.length && task.status !== prevStatus) {
      const type =
        task.status === 'done'   ? 'task_completed' :
        task.status === 'review' ? 'task_review'    : 'task_updated';
      this.notifyMultiple(task, newIds.filter(uid => uid !== actorId), actorId, type).catch(e => this.logger.error('Notify failed', e));
      this.notifs.notifyUsers(newIds, { type: 'task', title: `Task ${task.status}`, body: `"${task.title}" moved to ${task.status}`, project_id: task.project_id });
    }

    return task;
  }

  async reorder(orders: { id: string; sort_order: number; status: string }[]) {
    await Promise.all(
      orders.map(({ id, sort_order, status }) => this.repo.update(id, { sort_order, status } as any)),
    );
  }

  async delete(id: string) { await this.repo.delete(id); }

  async addImages(taskId: string, base64Images: string[]): Promise<Task> {
    const task = await this.repo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    const urls = await Promise.all(
      base64Images.map(b64 => this.cloudinary.uploadImage(b64, 'task-images')),
    );
    task.image_urls = [...(task.image_urls || []), ...urls];
    return this.repo.save(task);
  }

  async removeImage(taskId: string, imageUrl: string): Promise<Task> {
    const task = await this.repo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    task.image_urls = (task.image_urls || []).filter(u => u !== imageUrl);
    return this.repo.save(task);
  }

  async toggleLike(taskId: string, userId: string): Promise<Task> {
    const task = await this.repo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    const liked = task.liked_by || [];
    task.liked_by = liked.includes(userId)
      ? liked.filter(id => id !== userId)
      : [...liked, userId];
    return this.repo.save(task);
  }

  // ── Notify comment on task (called from CommentsService) ──────────────────
  async notifyComment(taskId: string, actorId: string, comment: string) {
    const task = await this.repo.findOne({ where: { id: taskId } });
    if (!task) return;
    const ids = (task.assignee_ids?.length ? task.assignee_ids : (task.assignee_id ? [task.assignee_id] : []))
      .filter(id => id !== actorId);
    if (!ids.length) return;
    const [actor, project, activeUsers] = await Promise.all([
      this.users.findOne({ where: { id: actorId } }),
      this.projects.findOne({ where: { id: task.project_id } }),
      this.users.find({ where: { id: In(ids), is_active: true }, select: ['id', 'email', 'first_name', 'last_name'] }),
    ]);
    const actorName = actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined;
    const userMap = Object.fromEntries(activeUsers.map(u => [u.id, u]));

    await Promise.all(ids.map(async uid => {
      const user = userMap[uid];
      if (!user?.email) return;
      await this.mail.send({
        to: user.email,
        recipientName: `${user.first_name} ${user.last_name}`.trim(),
        type: 'comment_added',
        taskTitle: task.title,
        projectName: project?.name,
        priority: task.priority,
        actorName,
        comment,
      }).catch(e => this.logger.error(`Comment notify failed for ${user.email}`, e));
    }));
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private async notifyMultiple(
    task: Task,
    userIds: string[],
    actorId?: string,
    type: 'task_assigned' | 'task_updated' | 'task_completed' | 'task_review' = 'task_assigned',
  ) {
    if (!userIds.length) return;
    const [actor, project] = await Promise.all([
      actorId ? this.users.findOne({ where: { id: actorId } }) : null,
      this.projects.findOne({ where: { id: task.project_id } }),
    ]);
    const actorName = actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined;
    const activeUsers = await this.users.find({ where: { id: In(userIds), is_active: true }, select: ['id', 'email', 'first_name', 'last_name'] });
    const userMap = Object.fromEntries(activeUsers.map(u => [u.id, u]));

    await Promise.all(userIds.map(async uid => {
      const user = userMap[uid];
      if (!user?.email) return;
      await this.mail.send({
        to: user.email,
        recipientName: `${user.first_name} ${user.last_name}`.trim(),
        type,
        taskTitle: task.title,
        taskDescription: task.description || undefined,
        projectName: project?.name,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date || undefined,
        phase: task.phase || undefined,
        actorName,
        project_id: task.project_id,
        task_id: task.id,
        imageUrls: task.image_urls || undefined,
      }).catch(e => this.logger.error(`Notify email failed for ${user.email}`, e));
    }));
  }

  private async notifyPhaseGroup(task: Task, actorId?: string) {
    const roles = PHASE_ROLES[task.phase!];
    if (!roles?.length) return;

    const [actor, project] = await Promise.all([
      actorId ? this.users.findOne({ where: { id: actorId } }) : null,
      this.projects.findOne({ where: { id: task.project_id } }),
    ]);
    const actorName = actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined;

    // Fetch members for ALL matching roles
    const allMembers = (await Promise.all(
      roles.map(role =>
        this.members.find({
          where: { project_id: task.project_id, role: role as any },
          relations: ['user'],
        }),
      ),
    )).flat();

    await Promise.all(
      allMembers
        .filter(m => m.user?.is_active && m.user_id !== actorId)
        .map(m =>
          this.mail.send({
            to: m.user!.email,
            recipientName: `${m.user!.first_name} ${m.user!.last_name}`.trim(),
            type: 'phase_task_created',
            taskTitle: task.title,
            taskDescription: task.description || undefined,
            projectName: project?.name,
            priority: task.priority,
            status: task.status,
            dueDate: task.due_date || undefined,
            phase: task.phase || undefined,
            actorName,
            project_id: task.project_id,
            task_id: task.id,
            imageUrls: task.image_urls || undefined,
          }).catch(e => this.logger.error(`Phase notify failed for ${m.user!.email}`, e)),
        ),
    );
  }
}
