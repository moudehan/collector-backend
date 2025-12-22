import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;

      this.logger.log(
        JSON.stringify({
          message: 'HTTP request',
          method,
          url: originalUrl,
          statusCode,
          durationMs: duration,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        }),
      );
    });

    next();
  }
}
