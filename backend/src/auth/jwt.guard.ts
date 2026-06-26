import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload { sub: string; email: string; system_role: string; }

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
