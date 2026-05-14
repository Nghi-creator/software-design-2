import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
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

    await prisma.idempotencyKey.create({
      data: {
        key,
        status: 'IN_PROGRESS'
      }
    });
  } catch (error: any) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return next(error);
    }

    const existingKey = await prisma.idempotencyKey.findUnique({
      where: { key }
    });

    if (existingKey?.status === 'COMPLETED' && existingKey.response && existingKey.statusCode) {
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
      
      redis.setex(`idempotency:${key}`, 86400, cacheBody).catch(console.error);
      
      prisma.idempotencyKey.update({
        where: { key },
        data: {
          status: 'COMPLETED',
          statusCode: res.statusCode,
          response: responseString
        }
      }).catch(console.error);
    }
    
    return originalJson.call(this, body);
  };

  next();
};
