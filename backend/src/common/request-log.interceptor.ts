import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const { method, originalUrl, ip } = req;
    const start = Date.now();
    const res = ctx.switchToHttp().getResponse();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      const msg = `${method} ${originalUrl} ${status} ${ms}ms [${ip}]`;
      if (status >= 400) this.logger.error(msg);
      else this.logger.log(msg);
    });

    return next.handle();
  }
}
