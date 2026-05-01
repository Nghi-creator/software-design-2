import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['idempotency-key'] as string;

  if (!key) {
    return next();
  }

  // Check Redis first for fast path
  const cachedResponse = await redis.get(`idempotency:${key}`);
  if (cachedResponse) {
    return res.status(200).json(JSON.parse(cachedResponse));
  }

  // Check DB for persistent idempotency
  const existingKey = await prisma.idempotencyKey.findUnique({
    where: { key }
  });

  if (existingKey) {
    return res.status(200).json(JSON.parse(existingKey.response));
  }

  // Intercept res.json
  const originalJson = res.json;
  
  res.json = function (body) {
    // Restore original function to avoid infinite loop
    res.json = originalJson;

    // Only save on success or certain errors
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const responseString = JSON.stringify(body);
      
      // Save to Redis (expire in 24h)
      redis.setex(`idempotency:${key}`, 86400, responseString).catch(console.error);
      
      // Save to DB
      prisma.idempotencyKey.create({
        data: {
          key,
          response: responseString
        }
      }).catch(console.error);
    }
    
    return originalJson.call(this, body);
  };

  next();
};
