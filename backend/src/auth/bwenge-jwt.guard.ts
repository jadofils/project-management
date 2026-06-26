import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class BwengeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    try {
      request.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!);
      return true;
    } catch { throw new UnauthorizedException('Invalid token'); }
  }
}

export function isProjectManager(roles: string[]): boolean {
  return ['admin','super_admin','faculty_admin','department_head','program_coordinator','lecturer'].some(r => roles.includes(r));
}
