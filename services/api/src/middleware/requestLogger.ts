import { NextFunction, Request, Response } from 'express';

export const logApiRequest = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const userAgent = req.get('user-agent') ?? 'unknown';

    console.log(
      `[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs.toFixed(1)}ms ip=${req.ip} ua="${userAgent}"`
    );
  });

  next();
};
