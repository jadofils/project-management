import { HttpException, HttpStatus } from '@nestjs/common';

export class EntityNotFoundException extends HttpException {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} with id ${id} not found` : `${entity} not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntryException extends HttpException {
  constructor(field: string, value: string) {
    super(`${field} "${value}" already exists`, HttpStatus.CONFLICT);
  }
}

export class InsufficientPermissionException extends HttpException {
  constructor(action = 'perform this action') {
    super(`You do not have permission to ${action}`, HttpStatus.FORBIDDEN);
  }
}

export class InvalidTokenException extends HttpException {
  constructor(reason = 'Token is invalid or expired') {
    super(reason, HttpStatus.BAD_REQUEST);
  }
}

export class ValidationException extends HttpException {
  constructor(errors: string | string[]) {
    super(Array.isArray(errors) ? errors.join('; ') : errors, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class GeofenceException extends HttpException {
  constructor(distance: number, max: number) {
    super(`Outside office geofence (${Math.round(distance)}m > ${max}m)`, HttpStatus.FORBIDDEN);
  }
}

export class SessionExpiredException extends HttpException {
  constructor() {
    super('Session expired — please sign in again', HttpStatus.UNAUTHORIZED);
  }
}

export class RateLimitException extends HttpException {
  constructor() {
    super('Too many requests — please wait a moment', HttpStatus.TOO_MANY_REQUESTS);
  }
}
