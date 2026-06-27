import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Project, ProjectMember, Task, User, Division } from '../database/entities';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private repo: Repository<Project>,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Division) private divisions: Repository<Division>,
  ) {}

  async getMyProjects(userId: string, systemRole: string) {
    let projects: Project[];
    if (systemRole === 'admin') {
      projects = await this.repo.find({ order: { updated_at: 'DESC' } });
    } else {
      const [ps, ms] = await Promise.all([
        this.repo.find({ order: { updated_at: 'DESC' } }),
        this.members.find({ where: { user_id: userId }, select: ['project_id'] }),
      ]);
      const memberIds = ms.map(m => m.project_id);
      projects = ps.filter(p => p.owner_id === userId || memberIds.includes(p.id));
    }

    const divIds = [...new Set(projects.map(p => p.division_id).filter(Boolean))] as string[];
    const divisions = divIds.length ? await this.divisions.find({ where: { id: In(divIds) }, select: ['id', 'name'] }) : [];
    const divMap = Object.fromEntries(divisions.map(d => [d.id, d]));
    return projects.map(p => ({ ...p, division_name: p.division_id ? divMap[p.division_id]?.name || null : null, type: p.type || 'individual' }));
  }

  async create(userId: string, dto: any) {
    const entity = this.repo.create({
      name: dto.name, description: dto.description ?? null, owner_id: userId,
      division_id: dto.division_id || null,
      type: dto.division_id ? 'company' : (dto.type || 'individual'),
    } as any);
    const p = await this.repo.save(entity) as unknown as Project;
    const memberEntity = this.members.create({
      project_id: p.id, user_id: userId,
      role: 'project_manager', roles: ['project_manager'], permission_level: 'manager',
    } as any);
    await this.members.save(memberEntity);
    return p;
  }

  async getOne(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }

  async setStatus(id: string, status: string, userId: string, systemRole: string) {
    if (systemRole !== 'admin') throw new ForbiddenException('Only admins can change project status');
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Project not found');
    p.status = status;
    return this.repo.save(p);
  }

  async delete(id: string, userId: string, systemRole: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException();
    if (p.owner_id !== userId && systemRole !== 'admin') throw new ForbiddenException();
    await this.repo.remove(p);
  }

  async getAdminStats() {
    const [totalProjects, totalUsers, totalTasks, activeProjects, disabledProjects, companyProjects, individualProjects] = await Promise.all([
      this.repo.count(),
      this.users.count(),
      this.tasks.count(),
      this.repo.count({ where: { status: 'active' } }),
      this.repo.count({ where: { status: 'disabled' } }),
      this.repo.count({ where: { type: 'company' } }),
      this.repo.count({ where: { type: 'individual' } }),
    ]);

    const tasksByStatus = await this.tasks
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany();

    const projectsWithStats = await this.repo
      .createQueryBuilder('p')
      .leftJoin('project_members', 'pm', 'pm.project_id = p.id')
      .leftJoin('tasks', 't', 't.project_id = p.id')
      .select('p.id', 'id')
      .addSelect('p.name', 'name')
      .addSelect('p.status', 'status')
      .addSelect('p.owner_id', 'owner_id')
      .addSelect('p.created_at', 'created_at')
      .addSelect('COUNT(DISTINCT pm.id)', 'member_count')
      .addSelect('COUNT(DISTINCT t.id)', 'task_count')
      .groupBy('p.id')
      .orderBy('p.updated_at', 'DESC')
      .getRawMany();

    const allUsers = await this.users.find({
      select: ['id', 'first_name', 'last_name', 'email', 'system_role', 'is_active', 'created_at'],
      order: { created_at: 'DESC' },
    });

    return {
      totalProjects,
      activeProjects,
      disabledProjects,
      companyProjects,
      individualProjects,
      totalUsers,
      activeUsers: allUsers.filter(u => u.is_active).length,
      totalTasks,
      tasksByStatus: Object.fromEntries(tasksByStatus.map(r => [r.status, parseInt(r.count)])),
      projects: projectsWithStats,
      users: allUsers,
    };
  }
}
