import { Request, Response } from 'express';
import { getCsvImportErrors, getLatestCsvImport } from '../services/importStatus';

export const getLatestCsvImportStatus = async (_req: Request, res: Response) => {
  try {
    const job = await getLatestCsvImport();
    res.json({ success: true, job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCsvImportJobErrors = async (req: Request, res: Response) => {
  const limit = parseBoundedInteger(req.query.limit, 50, 1, 500);
  const offset = parseBoundedInteger(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  if (limit === null || offset === null) {
    return res.status(400).json({ success: false, error: 'Invalid pagination params' });
  }

  try {
    const errors = await getCsvImportErrors(req.params.id as string, limit, offset);
    res.json({ success: true, errors, pagination: { limit, offset } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const parseBoundedInteger = (
  value: unknown,
  defaultValue: number,
  min: number,
  max: number
) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
};
