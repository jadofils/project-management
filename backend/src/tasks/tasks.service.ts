import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, User, Project, ProjectMember } from '../database/entities';
import { MailService } from '../mail/mail.service';

const PHASE_ROLE: Record<string, string> = {
  backend:       'backend_dev',
  frontend:      'frontend_dev',
  documentation: 'documentalist',
  qa_testing:    'qa_tester',
  data_analyst:  'data_analyst',
};

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)          private repo: Repository<Task>,
    @InjectRepository(User)          private users: Repository<User>,
    @InjectRepository(Project)       private projects: Repository<Project>,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
    private mail: MailService,
  ) {}

  async getByProject(projectId: string) {
    return this.repo.find({ where: { project_id: projectId }, order: { sort_order: 'ASC' } });
  }

  async create(userId: string, dto: any) {
    const count = await this.repo.count({ where: { project_id: dto.project_id, status: dto.status || 'todo' } });
    const task = await this.repo.save(this.repo.create({ ...dto, sort_order: count } as any)) as unknown as Task;

    if (task.assignee_id && task.assignee_id !== userId) {
      // Specific assignee → notify only them
      this.notifyAssigned(task, userId).catch(() => { /* silent */ });
    } else if (task.phase && PHASE_ROLE[task.phase]) {
      // Phase task with no assignee → notify all members with matching role
      this.notifyPhaseGroup(task, userId).catch(() => { /* silent */ });
    }
    return task;
  }

  async update(id: string, dto: any) {
    const before = await this.repo.findOne({ where: { id } });
    if (!before) throw new NotFoundException();

    const prevAssignee = before.assignee_id;
    const prevStatus   = before.status;

    Object.assign(before, dto);
    const task = await this.repo.save(before);

    const actorId = dto._actor_id;

    // New assignee added
    if (task.assignee_id && task.assignee_id !== prevAssignee) {
      this.notifyAssigned(task, actorId).catch(() => { /* silent */ });
    }
    // Status changes for already-assigned task
    else if (task.assignee_id && task.status !== prevStatus) {
      const type =
        task.status === 'done'   ? 'task_completed' :
        task.status === 'review' ? 'task_review'    : 'task_updated';
      this.notifyStatusChange(task, actorId, type).catch(() => { /* silent */ });
    }

    return task;
  }

  async reorder(orders: { id: string; sort_order: number; status: string }[]) {
    await Promise.all(
      orders.map(({ id, sort_order, status }) => this.repo.update(id, { sort_order, status } as any)),
    );
  }

  async delete(id: string) { await this.repo.delete(id); }

  // ── Notify comment on task (called from CommentsService) ──────────────────
  async notifyComment(taskId: string, actorId: string, comment: string) {
    const task = await this.repo.findOne({ where: { id: taskId } });
    if (!task?.assignee_id || task.assignee_id === actorId) return;
    const [assignee, actor, project] = await Promise.all([
      this.users.findOne({ where: { id: task.assignee_id } }),
      this.users.findOne({ where: { id: actorId } }),
      this.projects.findOne({ where: { id: task.project_id } }),
    ]);
    if (!assignee?.email) return;
    await this.mail.send({
      to: assignee.email,
      recipientName: `${assignee.first_name} ${assignee.last_name}`.trim(),
      type: 'comment_added',
      taskTitle: task.title,
      projectName: project?.name,
      priority: task.priority,
      actorName: actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined,
      comment,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private async notifyAssigned(task: Task, actorId?: string) {
    const [assignee, actor, project] = await Promise.all([
      this.users.findOne({ where: { id: task.assignee_id! } }),
      actorId ? this.users.findOne({ where: { id: actorId } }) : null,
      this.projects.findOne({ where: { id: task.project_id } }),
    ]);
    if (!assignee?.email) return;
    await this.mail.send({
      to: assignee.email,
      recipientName: `${assignee.first_name} ${assignee.last_name}`.trim(),
      type: 'task_assigned',
      taskTitle: task.title,
      taskDescription: task.description || undefined,
      projectName: project?.name,
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date || undefined,
      phase: task.phase || undefined,
      actorName: actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined,
    });
  }

  private async notifyStatusChange(
    task: Task, actorId?: string,
    type: 'task_updated' | 'task_completed' | 'task_review' = 'task_updated',
  ) {
    const [assignee, actor, project] = await Promise.all([
      this.users.findOne({ where: { id: task.assignee_id! } }),
      actorId ? this.users.findOne({ where: { id: actorId } }) : null,
      this.projects.findOne({ where: { id: task.project_id } }),
    ]);
    if (!assignee?.email) return;
    await this.mail.send({
      to: assignee.email,
      recipientName: `${assignee.first_name} ${assignee.last_name}`.trim(),
      type,
      taskTitle: task.title,
      taskDescription: task.description || undefined,
      projectName: project?.name,
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date || undefined,
      actorName: actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined,
    });
  }

  private async notifyPhaseGroup(task: Task, actorId?: string) {
    const role = PHASE_ROLE[task.phase!];
    if (!role) return;

    const [projectMembers, actor, project] = await Promise.all([
      this.members.find({
        where: { project_id: task.project_id, role: role as any },
        relations: ['user'],
      }),
      actorId ? this.users.findOne({ where: { id: actorId } }) : null,
      this.projects.findOne({ where: { id: task.project_id } }),
    ]);

    const actorName = actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined;

    await Promise.all(
      projectMembers
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
          }),
        ),
    );
  }
}
