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
  const { limit, offset } = res.locals.csvImportErrorPagination as { limit: number; offset: number };

  try {
    const errors = await getCsvImportErrors(req.params.id as string, limit, offset);
    res.json({ success: true, errors, pagination: { limit, offset } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
