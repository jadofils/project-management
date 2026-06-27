import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to users with certain system_role values.
 * Usage: @Roles('admin')  or  @Roles('admin', 'pm')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
