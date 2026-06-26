import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, User, Project } from '../database/entities';
import { MailService } from '../mail/mail.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private repo: Repository<Task>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Project) private projects: Repository<Project>,
    private mail: MailService,
  ) {}

  async getByProject(projectId: string) {
    return this.repo.find({ where: { project_id: projectId }, order: { sort_order: 'ASC' } });
  }

  async create(userId: string, dto: any) {
    const count = await this.repo.count({ where: { project_id: dto.project_id, status: dto.status || 'todo' } });
    const task = await this.repo.save(this.repo.create({ ...dto, sort_order: count } as any)) as unknown as Task;

    // Notify assignee if set
    if (task.assignee_id && task.assignee_id !== userId) {
      this.notifyAssigned(task, userId).catch(() => { /* silent */ });
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

    // New assignee
    if (task.assignee_id && task.assignee_id !== prevAssignee) {
      this.notifyAssigned(task, dto._actor_id).catch(() => { /* silent */ });
    }
    // Status changed to review → notify assignee
    else if (task.assignee_id && task.status !== prevStatus && task.status === 'review') {
      this.notifyStatusChange(task, dto._actor_id, 'task_review').catch(() => { /* silent */ });
    }
    // Status changed to done → notify assignee
    else if (task.assignee_id && task.status !== prevStatus && task.status === 'done') {
      this.notifyStatusChange(task, dto._actor_id, 'task_completed').catch(() => { /* silent */ });
    }
    // Generic status/priority update while already assigned
    else if (task.assignee_id && (task.status !== prevStatus)) {
      this.notifyStatusChange(task, dto._actor_id, 'task_updated').catch(() => { /* silent */ });
    }

    return task;
  }

  async reorder(orders: { id: string; sort_order: number; status: string }[]) {
    await Promise.all(
      orders.map(({ id, sort_order, status }) => this.repo.update(id, { sort_order, status } as any)),
    );
  }

  async delete(id: string) { await this.repo.delete(id); }

  // ── Email helpers ────────────────────────────────────────────────────────
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
      actorName: actor ? `${actor.first_name} ${actor.last_name}`.trim() : undefined,
    });
  }

  private async notifyStatusChange(task: Task, actorId?: string, type: 'task_updated' | 'task_completed' | 'task_review' = 'task_updated') {
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
}
