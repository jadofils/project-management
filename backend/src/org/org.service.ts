import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Department, JobPosition, EmployeeProfile, User } from '../database/entities';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(Division)        private divisions: Repository<Division>,
    @InjectRepository(Department)      private departments: Repository<Department>,
    @InjectRepository(JobPosition)     private positions: Repository<JobPosition>,
    @InjectRepository(EmployeeProfile) private employees: Repository<EmployeeProfile>,
    @InjectRepository(User)            private users: Repository<User>,
  ) {}

  // ── Divisions ──────────────────────────────────────────────────────────────
  getAllDivisions() { return this.divisions.find({ order: { name: 'ASC' } }); }

  async createDivision(dto: { name: string; code: string; head_user_id?: string; description?: string }) {
    const existing = await this.divisions.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Division code already exists');
    return this.divisions.save(this.divisions.create(dto as any));
  }

  async updateDivision(id: string, dto: Partial<Division>) {
    const div = await this.divisions.findOne({ where: { id } });
    if (!div) throw new NotFoundException('Division not found');
    Object.assign(div, dto);
    return this.divisions.save(div);
  }

  async deleteDivision(id: string) {
    const div = await this.divisions.findOne({ where: { id } });
    if (!div) throw new NotFoundException('Division not found');
    await this.divisions.remove(div);
    return { ok: true };
  }

  // ── Departments ────────────────────────────────────────────────────────────
  getDepartments(divisionId?: string) {
    const where: any = {};
    if (divisionId) where.division_id = divisionId;
    return this.departments.find({ where, order: { name: 'ASC' } });
  }

  async createDepartment(dto: { division_id: string; name: string; head_user_id?: string }) {
    return this.departments.save(this.departments.create(dto as any));
  }

  async updateDepartment(id: string, dto: Partial<Department>) {
    const dept = await this.departments.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    Object.assign(dept, dto);
    return this.departments.save(dept);
  }

  async deleteDepartment(id: string) {
    const dept = await this.departments.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    await this.departments.remove(dept);
    return { ok: true };
  }

  // ── Job Positions ──────────────────────────────────────────────────────────
  getPositions(divisionId?: string) {
    const where: any = {};
    if (divisionId) where.division_id = divisionId;
    return this.positions.find({ where, order: { title: 'ASC' } });
  }

  async createPosition(dto: { title: string; division_id?: string; grade?: string; min_salary?: number; max_salary?: number }) {
    return this.positions.save(this.positions.create(dto as any));
  }

  async updatePosition(id: string, dto: Partial<JobPosition>) {
    const pos = await this.positions.findOne({ where: { id } });
    if (!pos) throw new NotFoundException('Position not found');
    Object.assign(pos, dto);
    return this.positions.save(pos);
  }

  async deletePosition(id: string) {
    const pos = await this.positions.findOne({ where: { id } });
    if (!pos) throw new NotFoundException('Position not found');
    await this.positions.remove(pos);
    return { ok: true };
  }

  // ── Employee Profiles ──────────────────────────────────────────────────────
  async getEmployees(departmentId?: string) {
    const where: any = {};
    if (departmentId) where.department_id = departmentId;
    const profiles = await this.employees.find({ where, order: { created_at: 'DESC' } });
    const userIds = profiles.map(e => e.user_id);
    const users = userIds.length ? await this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name', 'avatar_url', 'system_role', 'is_active'] }) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return profiles.map(p => ({ ...p, user: userMap[p.user_id] || null }));
  }

  async getEmployee(userId: string) {
    const profile = await this.employees.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundException('Employee profile not found');
    const user = await this.users.findOne({ where: { id: userId }, select: ['id', 'email', 'first_name', 'last_name', 'avatar_url', 'system_role', 'is_active'] });
    return { ...profile, user };
  }

  async createOrUpdateEmployee(userId: string, dto: {
    department_id?: string; job_position_id?: string; phone?: string;
    national_id?: string; date_of_birth?: string; hire_date?: string;
    contract_type?: string; employment_status?: string; salary_band?: number;
  }) {
    const existing = await this.employees.findOne({ where: { user_id: userId } });
    if (existing) {
      Object.assign(existing, dto);
      return this.employees.save(existing);
    }
    const profile = this.employees.create({ user_id: userId, ...dto } as any) as unknown as EmployeeProfile;
    return this.employees.save(profile);
  }

  // ── Org Chart ──────────────────────────────────────────────────────────────
  async getOrgChart() {
    const [divisions, departments, profiles] = await Promise.all([
      this.divisions.find({ order: { name: 'ASC' } }),
      this.departments.find(),
      this.employees.find(),
    ]);

    const userIds = profiles.map(e => e.user_id);
    const users = userIds.length ? await this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name', 'avatar_url', 'system_role', 'is_active'] }) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return divisions.map(div => ({
      ...div,
      departments: departments
        .filter(d => d.division_id === div.id)
        .map(dept => ({
          ...dept,
          employees: profiles
            .filter(p => p.department_id === dept.id)
            .map(p => ({ ...p, user: userMap[p.user_id] || null })),
        })),
    }));
  }
}
