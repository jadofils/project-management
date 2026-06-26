import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(GlobalExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    let status = 500, message = 'Internal server error';
    if (exception instanceof HttpException) { status = exception.getStatus(); const r = exception.getResponse(); message = typeof r === 'string' ? r : (r as any).message || message; }
    else if (exception instanceof Error) { message = exception.message; }
    this.log.error(`${req.method} ${req.url} → ${status}: ${message}`);
    res.status(status).json({ statusCode: status, message, path: req.url, timestamp: new Date().toISOString() });
  }
}
