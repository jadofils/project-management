import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task, TaskAssignmentLog, ProjectMember, User } from '../database/entities';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Task)              private tasks:   Repository<Task>,
    @InjectRepository(TaskAssignmentLog) private logs:    Repository<TaskAssignmentLog>,
    @InjectRepository(ProjectMember)     private members: Repository<ProjectMember>,
    @InjectRepository(User)              private users:   Repository<User>,
  ) {}

  private isAssignee(task: Task, userId: string): boolean {
    const ids = task.assignee_ids?.length ? task.assignee_ids : (task.assignee_id ? [task.assignee_id] : []);
    return ids.includes(userId);
  }

  private computeStats(tasks: Task[]) {
    const now = new Date();
    const stats = {
      totalAssigned:       tasks.length,
      todo:                0,
      in_progress:         0,
      review:              0,
      rework:              0,
      done:                0,
      overdue:             0,
      extendedDeadlines:   0,
      completedOnTime:     0,
      completedLate:       0,
    };
    for (const t of tasks) {
      const s = t.status;
      if (s === 'todo')         stats.todo++;
      else if (s === 'in_progress') stats.in_progress++;
      else if (s === 'review')  stats.review++;
      else if (s === 'rework')  stats.rework++;
      else if (s === 'done')    stats.done++;

      const hasDue = !!t.due_date;
      const isDone = s === 'done';

      if (hasDue && !isDone && new Date(t.due_date!) < now) stats.overdue++;

      if (t.original_due_date && t.due_date && t.due_date > t.original_due_date) stats.extendedDeadlines++;

      if (isDone && hasDue && t.completed_at) {
        if (new Date(t.completed_at) <= new Date(t.due_date!)) stats.completedOnTime++;
        else stats.completedLate++;
      }
    }
    return stats;
  }

  private async buildUserMap(userIds: string[]) {
    const unique = [...new Set(userIds.filter(Boolean))] as string[];
    if (unique.length === 0) return {};
    const users = await this.users.find({ where: { id: In(unique) } });
    return Object.fromEntries(users.map(u => [u.id, { id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email }]));
  }

  async getProjectStats(projectId: string, requestingUserId: string, isManager: boolean) {
    const [allTasks, members] = await Promise.all([
      this.tasks.find({ where: { project_id: projectId } }),
      this.members.find({ where: { project_id: projectId }, relations: ['user'] }),
    ]);

    const now = new Date();

    // ── My stats: tasks assigned to me OR created by me ─────────────────────
    const myTasks = allTasks.filter(t =>
      this.isAssignee(t, requestingUserId) || t.created_by === requestingUserId,
    );
    const myStats = this.computeStats(myTasks);
    const overdueTasks = myTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done');

    // Load my assignment logs
    const [myLogsRaw, myChangedByLogsRaw] = await Promise.all([
      this.logs.find({ where: { project_id: projectId, user_id: requestingUserId }, order: { created_at: 'DESC' }, take: 50 }),
      this.logs.find({ where: { project_id: projectId, changed_by: requestingUserId }, order: { created_at: 'DESC' }, take: 50 }),
    ]);

    const allUserIds = [...new Set([
      ...myLogsRaw.map(l => l.user_id),
      ...myLogsRaw.map(l => l.changed_by),
      ...myChangedByLogsRaw.map(l => l.user_id),
      ...myChangedByLogsRaw.map(l => l.changed_by),
    ])].filter(Boolean) as string[];

    const userMap = await this.buildUserMap(allUserIds);

    const result: any = {
      myStats,
      myTasks,
      overdueTasks,
      myLogs:          myLogsRaw.map(l => ({ ...l, user: l.user_id ? userMap[l.user_id] : null, changedByUser: l.changed_by ? userMap[l.changed_by] : null })),
      myChangedByLogs: myChangedByLogsRaw.map(l => ({ ...l, user: l.user_id ? userMap[l.user_id] : null, changedByUser: l.changed_by ? userMap[l.changed_by] : null })),
    };

    if (!isManager) return result;

    // ── Team stats (PM / admin) ────────────────────────────────────────────
    const teamStats = members
      .filter(m => m.user)
      .map(m => {
        const userTasks = allTasks.filter(t =>
          this.isAssignee(t, m.user_id) || t.created_by === m.user_id,
        );
        const s = this.computeStats(userTasks);
        const completionRate = s.totalAssigned > 0 ? Math.round((s.done / s.totalAssigned) * 100) : 0;
        const onTimeRate = (s.completedOnTime + s.completedLate) > 0
          ? Math.round((s.completedOnTime / (s.completedOnTime + s.completedLate)) * 100) : null;
        return { user: m.user, userId: m.user_id, role: m.role, roles: m.roles, ...s, completionRate, onTimeRate };
      })
      .sort((a, b) => b.totalAssigned - a.totalAssigned);

    // All overdue tasks for the project
    const projectOverdue = allTasks
      .filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done')
      .map(t => {
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(t.due_date!).getTime()) / 86_400_000));
        const taskAssignees = members.filter(m => this.isAssignee(t, m.user_id)).map(m => m.user).filter(Boolean);
        return { task: t, daysOverdue, assignees: taskAssignees };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const recentLogs = await this.logs.find({
      where: { project_id: projectId },
      order: { created_at: 'DESC' },
      take: 60,
    });

    const allLogUserIds = [...new Set([
      ...recentLogs.map(l => l.user_id),
      ...recentLogs.map(l => l.changed_by),
    ])].filter(Boolean) as string[];

    const fullUserMap = await this.buildUserMap([...allUserIds, ...allLogUserIds]);

    const projectStatusBreakdown: Record<string, number> = {};
    for (const t of allTasks) {
      projectStatusBreakdown[t.status] = (projectStatusBreakdown[t.status] || 0) + 1;
    }

    result.teamStats              = teamStats;
    result.projectOverdue         = projectOverdue;
    result.projectStatusBreakdown = projectStatusBreakdown;
    result.recentLogs             = recentLogs.map(l => ({
      ...l,
      user:          l.user_id ? fullUserMap[l.user_id] : null,
      changedByUser: l.changed_by ? fullUserMap[l.changed_by] : null,
    }));
    return result;
  }
}
