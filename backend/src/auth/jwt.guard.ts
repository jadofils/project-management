import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { ProjectMember } from '../database/entities';

export interface JwtPayload { sub: string; email: string; system_role: string; }

// ── Basic JWT auth ────────────────────────────────────────────────────────────
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    try {
      req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as JwtPayload;
      return true;
    } catch { throw new UnauthorizedException('Invalid or expired token'); }
  }
}

// ── Admin only ────────────────────────────────────────────────────────────────
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    try {
      const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as JwtPayload;
      req.user = payload;
      if (payload.system_role !== 'admin') throw new UnauthorizedException('Admin only');
      return true;
    } catch (e) { throw new UnauthorizedException((e as Error).message); }
  }
}

// ── Admin or Project Manager ──────────────────────────────────────────────────
@Injectable()
export class AdminOrPMGuard implements CanActivate {
  constructor(@InjectRepository(ProjectMember) private members: Repository<ProjectMember>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    try {
      const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as JwtPayload;
      req.user = payload;
      if (payload.system_role === 'admin') return true;
      const pmCount = await this.members.count({ where: { user_id: payload.sub, role: 'project_manager' } });
      if (pmCount > 0) return true;
      throw new UnauthorizedException('Only admins or project managers can do this');
    } catch (e) { throw new UnauthorizedException((e as Error).message); }
  }
}
