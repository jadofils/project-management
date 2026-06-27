import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord, LeaveRequest, LeaveBalance, LeaveType, Division, Department, Task, User, Project, EmployeeProfile } from '../database/entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AttendanceRecord) private attendance: Repository<AttendanceRecord>,
    @InjectRepository(LeaveRequest)     private leaves: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance)     private balances: Repository<LeaveBalance>,
    @InjectRepository(LeaveType)        private leaveTypes: Repository<LeaveType>,
    @InjectRepository(Division)         private divisions: Repository<Division>,
    @InjectRepository(Department)       private departments: Repository<Department>,
    @InjectRepository(Task)             private tasks: Repository<Task>,
    @InjectRepository(User)             private users: Repository<User>,
    @InjectRepository(EmployeeProfile)  private profiles: Repository<EmployeeProfile>,
  ) {}

  private csv(rows: string[][]) { return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'); }
  private ics(events: { summary: string; start: string; end: string }[]) {
    const header = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ProManager//Leave Calendar//EN'];
    const body = events.flatMap(e => ['BEGIN:VEVENT', `SUMMARY:${e.summary}`, `DTSTART:${e.start}`, `DTEND:${e.end}`, 'END:VEVENT']);
    return [...header, ...body, 'END:VCALENDAR'].join('\n');
  }

  // ── Attendance Report ──────────────────────────────────────────────────────
  async attendanceReport(userId?: string, from?: string, to?: string) {
    const where: any = {};
    if (userId) where.user_id = userId;
    if (from) where.date = require('typeorm').MoreThanOrEqual ? undefined : undefined;
    let records = await this.attendance.find({ where, order: { date: 'DESC', clock_in: 'DESC' as any } });
    if (from) records = records.filter(r => r.date >= from);
    if (to) records = records.filter(r => r.date <= to);

    const userIds = [...new Set(records.map(r => r.user_id))];
    const users = userIds.length ? await this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name'] }) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const rows = [['User', 'Email', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Method', 'Status']];
    for (const r of records) {
      const u = userMap[r.user_id];
      const hours = r.clock_in && r.clock_out ? ((new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3_600_000).toFixed(1) : '';
      rows.push([u ? `${u.first_name} ${u.last_name}` : r.user_id, u?.email || '', r.date, r.clock_in?.toISOString() || '', r.clock_out?.toISOString() || '', hours, r.method, r.status]);
    }
    return { csv: this.csv(rows), filename: `attendance-${from || 'all'}-to-${to || 'all'}.csv` };
  }

  // ── Leave Report ───────────────────────────────────────────────────────────
  async leaveReport(year?: number) {
    const y = year || new Date().getFullYear();
    const [balances, types, users] = await Promise.all([
      this.balances.find({ where: { year: y } }),
      this.leaveTypes.find(),
      this.users.find({ select: ['id', 'email', 'first_name', 'last_name'] }),
    ]);
    const typeMap = Object.fromEntries(types.map(t => [t.id, t]));
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const rows = [['User', 'Email', 'Leave Type', 'Allocated', 'Used', 'Remaining']];
    for (const b of balances) {
      const u = userMap[b.user_id];
      rows.push([u ? `${u.first_name} ${u.last_name}` : b.user_id, u?.email || '', typeMap[b.leave_type_id]?.name || '', String(b.allocated), String(b.used), String(b.remaining)]);
    }
    return { csv: this.csv(rows), filename: `leave-balances-${y}.csv` };
  }

  // ── Headcount Report ───────────────────────────────────────────────────────
  async headcountReport() {
    const [divisions, departments, profiles] = await Promise.all([
      this.divisions.find({ order: { name: 'ASC' } }),
      this.departments.find(),
      this.profiles.find({ where: { employment_status: 'active' } }),
    ]);
    const deptMap = Object.fromEntries(departments.map(d => [d.id, d]));
    const divMap = Object.fromEntries(divisions.map(d => [d.id, d]));

    const rows = [['Division', 'Department', 'Headcount']];
    for (const div of divisions) {
      for (const dept of departments.filter(d => d.division_id === div.id)) {
        const count = profiles.filter(p => p.department_id === dept.id).length;
        rows.push([div.name, dept.name, String(count)]);
      }
    }
    rows.push(['', 'TOTAL', String(profiles.length)]);
    return { csv: this.csv(rows), filename: `headcount-${new Date().toISOString().slice(0, 10)}.csv` };
  }

  // ── Task Completion Report ─────────────────────────────────────────────────
  async taskReport(projectId?: string) {
    const where: any = {};
    if (projectId) where.project_id = projectId;
    const tasks = await this.tasks.find({ where, order: { project_id: 'ASC' } });
    const userIds = [...new Set(tasks.map(t => t.completed_by).filter(Boolean))] as string[];
    const users = userIds.length ? await this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name'] }) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const rows = [['Project ID', 'Task Title', 'Status', 'Priority', 'Completed By', 'Completed At', 'On Time']];
    for (const t of tasks) {
      const completedBy = t.completed_by ? userMap[t.completed_by] : null;
      const onTime = t.due_date && t.completed_at ? (new Date(t.completed_at) <= new Date(t.due_date) ? 'Yes' : 'No') : '';
      rows.push([t.project_id, t.title, t.status, t.priority, completedBy ? `${completedBy.first_name} ${completedBy.last_name}` : '', t.completed_at?.toISOString() || '', onTime]);
    }
    return { csv: this.csv(rows), filename: `tasks-${projectId || 'all'}.csv` };
  }

  // ── Leave Calendar (.ics) ─────────────────────────────────────────────────
  async leaveCalendar() {
    const requests = await this.leaves.find({ where: { status: 'approved' } });
    const uids = [...new Set(requests.map(r => r.user_id))];
    const users = uids.length ? await this.users.find({ where: uids.map(id => ({ id }) as any), select: ['id', 'first_name', 'last_name'] }) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const events = requests.map(r => ({
      summary: `${userMap[r.user_id]?.first_name || 'User'} ${userMap[r.user_id]?.last_name || ''} — Leave`,
      start: r.start_date, end: r.end_date,
    }));
    return { ics: this.ics(events), filename: 'leave-calendar.ics' };
  }
}
