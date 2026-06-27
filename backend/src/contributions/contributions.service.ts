import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, User, Project, ProjectMember } from '../database/entities';

export interface ContributionTask {
  id: string;
  title: string;
  project_id: string;
  project_name: string;
  completed_by: string | null;
  confirmed_by_name: string | null;
}

export interface ContributionDay {
  date: string;
  count: number;
  tasks: ContributionTask[];
}

@Injectable()
export class ContributionsService {
  constructor(
    @InjectRepository(Task)          private tasks:    Repository<Task>,
    @InjectRepository(User)          private users:    Repository<User>,
    @InjectRepository(Project)       private projects: Repository<Project>,
    @InjectRepository(ProjectMember) private members:  Repository<ProjectMember>,
  ) {}

  // ── Contributions for a single user over a year ───────────────────────────
  async getForUser(userId: string, year?: number): Promise<ContributionDay[]> {
    const targetYear = year || new Date().getFullYear();
    const from = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const to   = new Date(`${targetYear}-12-31T23:59:59.999Z`);

    // Get all done tasks assigned to this user, with completed_at in year range
    const doneTasks = await this.tasks
      .createQueryBuilder('t')
      .where('t.status = :status', { status: 'done' })
      .andWhere('t.completed_at IS NOT NULL')
      .andWhere('t.completed_at >= :from', { from })
      .andWhere('t.completed_at <= :to', { to })
      .getMany();

    // Filter to tasks where user is an assignee
    const myTasks = doneTasks.filter(t => {
      const ids = t.assignee_ids?.length ? t.assignee_ids : (t.assignee_id ? [t.assignee_id] : []);
      return ids.includes(userId);
    });

    if (!myTasks.length) return [];

    // Enrich with project names and confirmer names
    const projectIds = [...new Set(myTasks.map(t => t.project_id))];
    const confirmerIds = [...new Set(myTasks.map(t => t.completed_by).filter(Boolean))] as string[];

    const [projectList, confirmerList] = await Promise.all([
      this.projects.find({ where: projectIds.map(id => ({ id })) }),
      confirmerIds.length ? this.users.find({ where: confirmerIds.map(id => ({ id })) }) : Promise.resolve([]),
    ]);

    const projectMap  = Object.fromEntries(projectList.map(p => [p.id, p.name]));
    const confirmerMap = Object.fromEntries(
      confirmerList.map(u => [u.id, `${u.first_name} ${u.last_name}`.trim()])
    );

    // Group by date
    const byDate: Record<string, ContributionTask[]> = {};
    for (const t of myTasks) {
      const date = t.completed_at!.toISOString().slice(0, 10);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push({
        id:                t.id,
        title:             t.title,
        project_id:        t.project_id,
        project_name:      projectMap[t.project_id] || 'Unknown project',
        completed_by:      t.completed_by,
        confirmed_by_name: t.completed_by && t.completed_by !== userId
          ? (confirmerMap[t.completed_by] || null)
          : null,
      });
    }

    return Object.entries(byDate)
      .map(([date, tasks]) => ({ date, count: tasks.length, tasks }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Contributions for all members of a project (PM/admin view) ────────────
  async getForProject(projectId: string, year?: number): Promise<Record<string, ContributionDay[]>> {
    const mems = await this.members.find({ where: { project_id: projectId }, relations: ['user'] });
    const result: Record<string, ContributionDay[]> = {};
    await Promise.all(
      mems.filter(m => m.user).map(async m => {
        result[m.user_id] = await this.getForUser(m.user_id, year);
      }),
    );
    return result;
  }

  // ── Cross-system summary for admin dashboard ──────────────────────────────
  async getSystemSummary(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const from = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const to   = new Date(`${targetYear}-12-31T23:59:59.999Z`);

    const raw = await this.tasks
      .createQueryBuilder('t')
      .select("DATE_TRUNC('day', t.completed_at)", 'day')
      .addSelect('COUNT(*)', 'count')
      .where('t.status = :status', { status: 'done' })
      .andWhere('t.completed_at IS NOT NULL')
      .andWhere('t.completed_at >= :from', { from })
      .andWhere('t.completed_at <= :to', { to })
      .groupBy("DATE_TRUNC('day', t.completed_at)")
      .orderBy("DATE_TRUNC('day', t.completed_at)", 'ASC')
      .getRawMany();

    return raw.map(r => ({
      date:  (r.day as Date).toISOString().slice(0, 10),
      count: parseInt(r.count),
    }));
  }

  // ── Check if requester can view a user's contributions ────────────────────
  async canViewUser(requestingUserId: string, targetUserId: string, systemRole: string): Promise<boolean> {
    if (systemRole === 'admin') return true;
    if (requestingUserId === targetUserId) return true;
    // PM can view contributions of users in projects they manage
    const myMemberships = await this.members.find({ where: { user_id: requestingUserId } });
    const myProjectIds  = myMemberships.filter(m => {
      const roles = m.roles?.length ? m.roles : [m.role];
      return roles.includes('project_manager') || m.permission_level === 'manager';
    }).map(m => m.project_id);
    if (!myProjectIds.length) return false;
    // Check if targetUser is a member of any of those projects
    const sharedMembers = await this.members.find({ where: { user_id: targetUserId } });
    return sharedMembers.some(m => myProjectIds.includes(m.project_id));
  }
}
