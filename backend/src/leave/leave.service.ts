import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveType, LeaveRequest, LeaveBalance, User, EmployeeProfile } from '../database/entities';
import { MailService } from '../mail/mail.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveType)     private types: Repository<LeaveType>,
    @InjectRepository(LeaveRequest)  private requests: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance)  private balances: Repository<LeaveBalance>,
    @InjectRepository(User)          private users: Repository<User>,
    @InjectRepository(EmployeeProfile) private profiles: Repository<EmployeeProfile>,
    private mail: MailService,
    private notifs: ChatGateway,
  ) {}

  // ── Leave Types ────────────────────────────────────────────────────────────
  getTypes() { return this.types.find({ order: { name: 'ASC' } }); }
  createType(dto: any) { return this.types.save(this.types.create(dto)); }
  deleteType(id: string) { return this.types.delete(id).then(() => ({ ok: true })); }

  // ── Leave Balances ─────────────────────────────────────────────────────────
  async getBalances(userId: string) {
    const year = new Date().getFullYear();
    let balances = await this.balances.find({ where: { user_id: userId, year } });
    if (balances.length === 0) {
      const types = await this.types.find();
      balances = await Promise.all(types.map(async t => {
        const used = await this.getUsedDays(userId, t.id, year);
        const remaining = t.days_per_year - used;
        const b = this.balances.create({ user_id: userId, leave_type_id: t.id, year, allocated: t.days_per_year, used, remaining } as any);
        return this.balances.save(b as any);
      }));
    }
    const typeMap = Object.fromEntries((await this.types.find()).map(t => [t.id, t]));
    return balances.map(b => ({ ...b, leave_type: typeMap[b.leave_type_id] }));
  }

  private async getUsedDays(userId: string, leaveTypeId: string, year: number): Promise<number> {
    const approved = await this.requests.find({ where: { user_id: userId, leave_type_id: leaveTypeId, status: 'approved' } });
    return approved.filter(r => new Date(r.start_date).getFullYear() === year).reduce((sum, r) => sum + r.days, 0);
  }

  // ── Leave Requests ─────────────────────────────────────────────────────────
  async getRequests(userId?: string, status?: string) {
    const where: any = {};
    if (userId) where.user_id = userId;
    if (status) where.status = status;
    const data = await this.requests.find({ where, order: { created_at: 'DESC' } });
    const [userIds, typeIds] = [[...new Set(data.map(r => r.user_id))], [...new Set(data.map(r => r.leave_type_id))]];
    const [users, types] = await Promise.all([
      userIds.length ? this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name'] }) : [],
      typeIds.length ? this.types.find({ where: typeIds.map(id => ({ id }) as any) }) : [],
    ]);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const typeMap = Object.fromEntries(types.map(t => [t.id, t]));
    return data.map(r => ({ ...r, user: userMap[r.user_id], leave_type: typeMap[r.leave_type_id] }));
  }

  async createRequest(userId: string, dto: { leave_type_id: string; start_date: string; end_date: string; reason?: string }) {
    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (end < start) throw new BadRequestException('End date must be after start date');
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;

    const balance = await this.balances.findOne({ where: { user_id: userId, leave_type_id: dto.leave_type_id, year: start.getFullYear() } });
    if (balance && days > balance.remaining) throw new BadRequestException(`Insufficient leave balance. You have ${balance.remaining} days remaining.`);

    const req = this.requests.create({ user_id: userId, ...dto, days } as any);
    const saved = await this.requests.save(req) as unknown as LeaveRequest;

    // Notify department heads
    const profile = await this.profiles.findOne({ where: { user_id: userId } });
    if (profile?.department_id) {
      const user = await this.users.findOne({ where: { id: userId }, select: ['first_name', 'last_name'] });
      this.mail.sendCustom({
        to: 'admin@company.com', subject: `Leave Request from ${user?.first_name} ${user?.last_name}`,
        body: `${user?.first_name} ${user?.last_name} has requested ${days} day(s) off from ${dto.start_date} to ${dto.end_date}.\n\nReason: ${dto.reason || 'Not specified'}`,
        project_id: undefined,
      }).catch(() => {});
    }

    return saved;
  }

  async approve(id: string, approvedBy: string) {
    const req = await this.requests.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'pending') throw new BadRequestException(`Request is already ${req.status}`);
    req.status = 'approved';
    req.approved_by = approvedBy;
    req.approved_at = new Date();
    const saved = await this.requests.save(req);

    // Update balance
    const year = new Date(req.start_date).getFullYear();
    const balance = await this.balances.findOne({ where: { user_id: req.user_id, leave_type_id: req.leave_type_id, year } });
    if (balance) {
      balance.used += req.days;
      balance.remaining = balance.allocated - balance.used;
      await this.balances.save(balance);
    }

    // Notify employee
    const [user, type] = await Promise.all([
      this.users.findOne({ where: { id: req.user_id }, select: ['email', 'first_name'] }),
      this.types.findOne({ where: { id: req.leave_type_id } }),
    ]);
    if (user) {
      this.mail.sendCustom({
        to: user.email, subject: 'Leave Request Approved',
        body: `Your ${req.days}-day ${type?.name || 'leave'} request (${req.start_date} to ${req.end_date}) has been approved.`,
      }).catch(() => {});
    }
    return saved;
  }

  async reject(id: string, rejectedBy: string, reason?: string) {
    const req = await this.requests.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'pending') throw new BadRequestException(`Request is already ${req.status}`);
    req.status = 'rejected';
    req.approved_by = rejectedBy;
    req.approved_at = new Date();
    req.rejection_reason = reason || null;
    this.notifs.notifyUsers([req.user_id], { type: 'system', title: 'Leave Rejected', body: `Your leave request has been rejected${reason ? `: ${reason}` : ''}` });
    return this.requests.save(req);
  }
}
