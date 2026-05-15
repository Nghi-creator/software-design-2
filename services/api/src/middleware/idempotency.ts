import { Request, Response, NextFunction } from 'express';
import { IdempotencyDependencies, idempotencyDependencies } from '../di';

export const createIdempotencyMiddleware = (dependencies: IdempotencyDependencies) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = req.headers['idempotency-key'] as string;

  if (!key) {
    return res.status(400).json({ success: false, error: 'Idempotency-Key header is required' });
  }

  try {
    const cachedResponse = await dependencies.redis.get(`idempotency:${key}`);
    if (cachedResponse) {
      const cached = JSON.parse(cachedResponse);
      return res.status(cached.statusCode).json(cached.body);
    }

    await dependencies.query(
      'insert into idempotency_keys (key, status) values ($1, $2)',
      [key, 'IN_PROGRESS']
    );
  } catch (error: any) {
    if (error.code !== '23505') {
      return next(error);
    }

    const existingKey = await dependencies.query(
      'select status, response, status_code as "statusCode" from idempotency_keys where key = $1',
      [key]
    ).then((result: { rows: Array<{ status: string; response: string | null; statusCode: number | null }> }) => result.rows[0]);

    if (existingKey?.status === 'COMPLETED' && existingKey.response && existingKey.statusCode !== null) {
      const body = JSON.parse(existingKey.response);
      await dependencies.redis.setex(
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
      const statusCode = res.statusCode;

      void (async () => {
        await dependencies.query(
          `
            update idempotency_keys
            set status = $2, status_code = $3, response = $4, updated_at = now()
            where key = $1
          `,
          [key, 'COMPLETED', statusCode, responseString]
        );

        await dependencies.redis.setex(`idempotency:${key}`, 86400, cacheBody).catch(console.error);
      })().catch(console.error);

      return originalJson.call(this, body);
    }
    
    return originalJson.call(this, body);
  };

  next();
};

export const idempotency = createIdempotencyMiddleware(idempotencyDependencies);
