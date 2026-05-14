import { Request, Response, NextFunction } from 'express';
import { query } from '../lib/db';
import { redis } from '../lib/redis';

export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['idempotency-key'] as string;

  if (!key) {
    return res.status(400).json({ success: false, error: 'Idempotency-Key header is required' });
  }

  try {
    const cachedResponse = await redis.get(`idempotency:${key}`);
    if (cachedResponse) {
      const cached = JSON.parse(cachedResponse);
      return res.status(cached.statusCode).json(cached.body);
    }

    await query(
      'insert into idempotency_keys (key, status) values ($1, $2)',
      [key, 'IN_PROGRESS']
    );
  } catch (error: any) {
    if (error.code !== '23505') {
      return next(error);
    }

    const existingKey = await query<{
      status: string;
      response: string | null;
      statusCode: number | null;
    }>(
      'select status, response, status_code as "statusCode" from idempotency_keys where key = $1',
      [key]
    ).then((result: { rows: Array<{ status: string; response: string | null; statusCode: number | null }> }) => result.rows[0]);

    if (existingKey?.status === 'COMPLETED' && existingKey.response && existingKey.statusCode !== null) {
      const body = JSON.parse(existingKey.response);
      await redis.setex(
        `idempotency:${key}`,
        86400,
        JSON.stringify({ statusCode: existingKey.statusCode, body })
      );
      return res.status(existingKey.statusCode).json(body);
    }

    return res.status(409).json({ success: false, error: 'Request is already in progress' });
  }

  const originalJson = res.json;
  
  res.json = function (body) {
    res.json = originalJson;

    if (res.statusCode !== 409) {
      const responseString = JSON.stringify(body);
      const cacheBody = JSON.stringify({ statusCode: res.statusCode, body });

      void (async () => {
        await query(
          `
            update idempotency_keys
            set status = $2, status_code = $3, response = $4, updated_at = now()
            where key = $1
          `,
          [key, 'COMPLETED', res.statusCode, responseString]
        );

        await redis.setex(`idempotency:${key}`, 86400, cacheBody).catch(console.error);
        originalJson.call(this, body);
      })().catch(next);

      return this;
    }
    
    return originalJson.call(this, body);
  };

  next();
};
