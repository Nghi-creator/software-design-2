import { NextFunction, Request, Response } from 'express';

const sensitiveKeys = new Set([
  'password',
  'accessToken',
  'authorization',
  'layoutUrl',
  'token',
  'qrCode',
  'passwordHash'
]);

export const logApiResponse = (_req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    console.log(`[api:response] ${JSON.stringify(redact(body))}`);
    return originalJson(body);
  }) as Response['json'];

  next();
};

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      sensitiveKeys.has(key) ? '[REDACTED]' : redact(entryValue)
    ])
  );
};
