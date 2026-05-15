import { NextFunction, Request, Response } from 'express';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateUuidParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];

    if (typeof value !== 'string' || !uuidPattern.test(value)) {
      return validationError(res, `Invalid ${paramName}`);
    }

    next();
  };
};

export const validateCheckinPayload = (req: Request, res: Response, next: NextFunction) => {
  if (!isNonEmptyString(req.body?.qrCode)) {
    return validationError(res, 'qrCode is required');
  }

  next();
};

export const validateCheckinSyncPayload = (req: Request, res: Response, next: NextFunction) => {
  const items = normalizeSyncItems(req.body);

  if (!Array.isArray(items)) {
    return validationError(res, 'items must be an array');
  }

  for (const [index, item] of items.entries()) {
    if (!isRecord(item)) {
      return validationError(res, `items[${index}] must be an object`);
    }

    if (!isNonEmptyString(item.qrCode)) {
      return validationError(res, `items[${index}].qrCode is required`);
    }

    if (item.localId !== undefined && typeof item.localId !== 'string') {
      return validationError(res, `items[${index}].localId must be a string`);
    }

    if (item.scannedAt !== undefined && !isValidDateString(item.scannedAt)) {
      return validationError(res, `items[${index}].scannedAt must be a valid date`);
    }
  }

  req.body.items = items;
  next();
};

export const validateCsvImportErrorQuery = (req: Request, res: Response, next: NextFunction) => {
  const limit = parseOptionalBoundedInteger(req.query.limit, 50, 1, 500);
  const offset = parseOptionalBoundedInteger(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  if (limit === null) {
    return validationError(res, 'limit must be an integer from 1 to 500');
  }

  if (offset === null) {
    return validationError(res, 'offset must be a non-negative integer');
  }

  res.locals.csvImportErrorPagination = { limit, offset };
  next();
};

const normalizeSyncItems = (body: any) => {
  if (Array.isArray(body?.items)) {
    return body.items;
  }

  if (Array.isArray(body?.qrCodes)) {
    return body.qrCodes.map((qrCode: unknown) => ({ qrCode }));
  }

  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown) => {
  return typeof value === 'string' && value.trim().length > 0;
};

const isValidDateString = (value: unknown) => {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
};

const parseOptionalBoundedInteger = (value: unknown, defaultValue: number, min: number, max: number) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
};

const validationError = (res: Response, error: string) => {
  return res.status(400).json({ success: false, error });
};
