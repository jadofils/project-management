import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse();
    const req  = ctx.getRequest();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, any>;
        // ValidationPipe sends { message: string[] } — join them
        if (Array.isArray(b.message)) {
          message = b.message.join('; ');
        } else if (typeof b.message === 'string') {
          message = b.message;
        } else if (typeof b.error === 'string') {
          message = b.error;
        }
      }
    } else if (exception instanceof QueryFailedError) {
      // TypeORM / Postgres errors — surface the real DB message
      status = HttpStatus.BAD_REQUEST;
      const detail = (exception as any).detail as string | undefined;
      message = detail || exception.message || 'Database error';
      // Translate common Postgres codes to friendly messages
      const code = (exception as any).code as string | undefined;
      if (code === '23505') message = detail?.replace('Key ', '').replace(/[()]/g, '') || 'This value already exists';
      if (code === '23503') message = 'Referenced record does not exist';
      if (code === '23502') message = `A required field is missing: ${(exception as any).column || ''}`;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.log.error(`${req.method} ${req.url} [${status}] ${message}`);

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
