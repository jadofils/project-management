import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import * as crypto from 'crypto';
import { AttendanceToken, AttendanceRecord, Office, User, EmployeeProfile } from '../database/entities';
import { InvalidTokenException, GeofenceException } from '../common/exceptions';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceToken)  private tokens: Repository<AttendanceToken>,
    @InjectRepository(AttendanceRecord) private records: Repository<AttendanceRecord>,
    @InjectRepository(Office)           private offices: Repository<Office>,
    @InjectRepository(User)             private users: Repository<User>,
    @InjectRepository(EmployeeProfile)  private profiles: Repository<EmployeeProfile>,
  ) {}

  private readonly SERVER_SECRET = process.env.INTER_SYSTEM_ENCRYPTION_KEY || 'attendance-fallback-secret';

  // ── QR Token Generation (employee calls this) ──────────────────────────────
  async generateToken(userId: string) {
    const now = new Date();
    const minute = Math.floor(now.getTime() / 60_000).toString();
    const payload = `${userId}:${minute}`;
    const hash = crypto.createHmac('sha256', this.SERVER_SECRET).update(payload).digest('hex');

    const expiresAt = new Date(now.getTime() + 90_000); // 90 seconds

    await this.tokens.save(this.tokens.create({ user_id: userId, token_hash: hash, expires_at: expiresAt } as any) as unknown as AttendanceToken);

    return { token: payload, hash, expires_at: expiresAt };
  }

  // ── QR Scan / Verify (admin/scanner calls this) ───────────────────────────
  async scanToken(tokenPayload: string, hash: string, scannerIp?: string, officeId?: string, lat?: number, lng?: number) {
    const expected = crypto.createHmac('sha256', this.SERVER_SECRET).update(tokenPayload).digest('hex');
    if (expected !== hash) throw new BadRequestException('Invalid QR token');

    const [userId, minuteStr] = tokenPayload.split(':');
    if (!userId || !minuteStr) throw new BadRequestException('Malformed token');

    const tokenMinute = parseInt(minuteStr, 10);
    const nowMinute = Math.floor(Date.now() / 60_000);
    if (Math.abs(nowMinute - tokenMinute) > 2) throw new BadRequestException('QR code expired — generate a new one');

    // One-time use check
    const used = await this.tokens.findOne({ where: { token_hash: hash, used: true } });
    if (used) throw new BadRequestException('QR code already used');

    // Geofence check (if office and coordinates provided)
    if (officeId && lat !== undefined && lng !== undefined) {
      const office = await this.offices.findOne({ where: { id: officeId } });
      if (office?.latitude && office?.longitude) {
        const distance = this.haversine(lat, lng, Number(office.latitude), Number(office.longitude));
        if (distance > office.radius_meters) {
          throw new GeofenceException(distance, office.radius_meters);
        }
      }
    }

    // Mark token as used
    await this.tokens.update({ token_hash: hash }, { used: true });

    // Delete expired tokens
    await this.tokens.delete({ expires_at: LessThan(new Date(Date.now() - 60_000)) });

    // Record attendance
    const today = new Date().toISOString().slice(0, 10);
    let record = await this.records.findOne({ where: { user_id: userId, date: today } });

    if (record && record.clock_in && !record.clock_out) {
      // Clock out
      record.clock_out = new Date();
      record.status = this.determineStatus(record.clock_in, record.clock_out);
      await this.records.save(record);
      return { action: 'clock_out', record, user_id: userId };
    } else if (!record) {
      // Clock in
      record = this.records.create({
        user_id: userId, date: today, clock_in: new Date(),
        method: 'qr', ip_address: scannerIp || null,
        office_id: officeId || null, verified: true,
      } as any) as unknown as AttendanceRecord;
      await this.records.save(record);
      return { action: 'clock_in', record, user_id: userId };
    } else {
      throw new BadRequestException('Already clocked in and out today');
    }
  }

  // ── Today's attendance ─────────────────────────────────────────────────────
  async getToday() {
    const today = new Date().toISOString().slice(0, 10);
    const records = await this.records.find({ where: { date: today } });
    const userIds = [...new Set(records.map(r => r.user_id))];
    const users = userIds.length ? await this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name'] }) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const present = records.filter(r => r.clock_in && !r.clock_out);
    const absent = records.filter(r => !r.clock_in);

    return {
      total: records.length,
      present: present.map(r => ({ ...r, user: userMap[r.user_id] })),
      completed: records.filter(r => r.clock_in && r.clock_out).length,
      records: records.map(r => ({ ...r, user: userMap[r.user_id] })),
    };
  }

  // ── Attendance records (filtered) ──────────────────────────────────────────
  async getRecords(userId?: string, from?: string, to?: string, page = 1, limit = 30) {
    const where: any = {};
    if (userId) where.user_id = userId;
    if (from && to) {
      where.date = MoreThanOrEqual(from);
      // Add $lte via another filter
      const [data, total] = await this.records.findAndCount({
        where: { ...where, date: MoreThanOrEqual(from) },
        order: { date: 'DESC', clock_in: 'DESC' as any },
        skip: (page - 1) * limit, take: limit,
      });
      // Filter by to date in-memory
      const filtered = data.filter(r => r.date <= to);
      const userIds = [...new Set(filtered.map(r => r.user_id))];
      const users = userIds.length ? await this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name'] }) : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      return { data: filtered.map(r => ({ ...r, user: userMap[r.user_id] })), total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) };
    }
    const [data, total] = await this.records.findAndCount({
      where, order: { date: 'DESC', clock_in: 'DESC' as any },
      skip: (page - 1) * limit, take: limit,
    });
    const userIds = [...new Set(data.map(r => r.user_id))];
    const users = userIds.length ? await this.users.find({ where: userIds.map(id => ({ id }) as any), select: ['id', 'email', 'first_name', 'last_name'] }) : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return { data: data.map(r => ({ ...r, user: userMap[r.user_id] })), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Offices ────────────────────────────────────────────────────────────────
  getOffices() { return this.offices.find({ order: { name: 'ASC' } }); }
  createOffice(dto: any) { return this.offices.save(this.offices.create(dto)); }

  // ── IVR Phone Call Handler (Webhook from Twilio / Africa's Talking) ──────
  async handleIvrCall(callerId: string, digits: string) {
    if (!callerId) throw new BadRequestException('Caller ID is required');

    // Find employee by phone number
    const profile = await this.profiles.findOne({ where: { phone: callerId } });
    if (!profile) {
      return this.ivrResponse(`<Say>Phone number ${callerId} is not registered. Please contact HR.</Say>`);
    }

    const user = await this.users.findOne({ where: { id: profile.user_id, is_active: true } });
    if (!user) return this.ivrResponse('<Say>Your account is inactive. Please contact HR.</Say>');

    const today = new Date().toISOString().slice(0, 10);
    let record = await this.records.findOne({ where: { user_id: user.id, date: today } });

    const choice = digits.trim();

    if (choice === '1') {
      // Clock in
      if (record && record.clock_in) {
        return this.ivrResponse(`<Say>You are already clocked in today at ${record.clock_in.toLocaleTimeString()}. Press 2 to clock out.</Say>`);
      }
      if (!record) {
        record = this.records.create({ user_id: user.id, date: today, clock_in: new Date(), method: 'call', verified: true } as any) as unknown as AttendanceRecord;
        await this.records.save(record);
      }
      return this.ivrResponse(`<Say>Welcome ${user.first_name}. You are now clocked in. Have a great day!</Say>`);
    } else if (choice === '2') {
      // Clock out
      if (!record || !record.clock_in) {
        return this.ivrResponse('<Say>You are not clocked in yet today. Press 1 to clock in.</Say>');
      }
      if (record.clock_out) {
        return this.ivrResponse(`<Say>You already clocked out at ${record.clock_out.toLocaleTimeString()}. Goodbye!</Say>`);
      }
      record.clock_out = new Date();
      record.method = 'call';
      record.status = this.determineStatus(record.clock_in, record.clock_out);
      await this.records.save(record);
      return this.ivrResponse(`<Say>Goodbye ${user.first_name}. You are now clocked out. Have a great evening!</Say>`);
    } else {
      // First call — prompt for choice
      if (record && record.clock_in && !record.clock_out) {
        return this.ivrResponse(`<Gather numDigits="1" timeout="10"><Say>Welcome ${user.first_name}. You are currently clocked in. Press 2 to clock out.</Say></Gather>`);
      }
      return this.ivrResponse(`<Gather numDigits="1" timeout="10"><Say>Welcome to ProManager Attendance. Press 1 to clock in, Press 2 to clock out.</Say></Gather>`);
    }
  }

  private ivrResponse(inner: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private determineStatus(clockIn: Date, clockOut: Date): string {
    const hours = (clockOut.getTime() - clockIn.getTime()) / 3_600_000;
    if (hours >= 8) return 'present';
    if (hours >= 4) return 'half_day';
    return 'absent';
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
