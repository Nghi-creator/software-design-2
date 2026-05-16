import fs from 'fs';
import csv from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from './lib/db';
import { redis } from './lib/redis';

export type QueryFunction = (
  text: string,
  params?: unknown[]
) => Promise<{ rows: any[]; rowCount?: number | null }>;

export type TransactionQueryFunction = <T = any>(
  text: string,
  params?: unknown[]
) => Promise<{ rows: T[]; rowCount?: number | null }>;

export type TransactionClient = {
  query: TransactionQueryFunction;
};

export type RegistrationDependencies = {
  withTransaction: <T>(callback: (client: TransactionClient) => Promise<T>) => Promise<T>;
  processPayment: (userId: string, amount: number, token: string) => Promise<string>;
  createQrCode: () => string;
  publishRegistrationConfirmed: (registrationId: string) => Promise<void>;
  markWorkshopSoldOut: (workshopId: string) => Promise<void>;
  clearWorkshopSoldOut: (workshopId: string) => Promise<void>;
};

export type CheckinDependencies = {
  query: QueryFunction;
  withTransaction: <T>(callback: (client: { query: QueryFunction }) => Promise<T>) => Promise<T>;
};

export type IdempotencyRedis = {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, seconds: number, value: string) => Promise<unknown>;
};

export type IdempotencyDependencies = {
  query: QueryFunction;
  redis: IdempotencyRedis;
};

export type CsvImportDependencies = {
  query: QueryFunction;
  fileExists: (filePath: string) => boolean;
  createReadStream: typeof fs.createReadStream;
  createCsvParser: () => NodeJS.ReadWriteStream;
};

const defaultQuery: QueryFunction = (text, params) => query<any>(text, params);

const withQueryTransaction = <T>(callback: (client: { query: QueryFunction }) => Promise<T>) => {
  return withTransaction((client) => {
    return callback({
      query: (text, params) => client.query<any>(text, params)
    });
  });
};

export const registrationDependencies: RegistrationDependencies = {
  withTransaction,
  processPayment: async (userId, amount, token) => {
    const { paymentCircuitBreaker } = await import('./services/payment');
    return paymentCircuitBreaker.fire(userId, amount, token);
  },
  createQrCode: uuidv4,
  publishRegistrationConfirmed: async (registrationId) => {
    const { publishRegistrationConfirmed } = await import('./jobs/notificationQueue');
    await publishRegistrationConfirmed(registrationId);
  },
  markWorkshopSoldOut: async (workshopId) => {
    await redis.setex(`registration:soldout:${workshopId}`, 60 * 60, '1');
  },
  clearWorkshopSoldOut: async (workshopId) => {
    await redis.del(`registration:soldout:${workshopId}`);
  }
};

export const checkinDependencies: CheckinDependencies = {
  query: defaultQuery,
  withTransaction: withQueryTransaction
};

export const idempotencyDependencies: IdempotencyDependencies = {
  query: defaultQuery,
  redis
};

export const csvImportDependencies: CsvImportDependencies = {
  query: defaultQuery,
  fileExists: fs.existsSync,
  createReadStream: fs.createReadStream,
  createCsvParser: () => csv()
};
