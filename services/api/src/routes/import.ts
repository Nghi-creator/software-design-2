import { Router } from 'express';
import { getCsvImportJobErrors, getLatestCsvImportStatus } from '../controllers/importController';
import { requireRole } from '../middleware/auth';
import { validateCsvImportErrorQuery, validateUuidParam } from '../middleware/requestValidation';
import { Roles } from '../types/domain';

const router = Router();

router.get('/csv/latest', requireRole(Roles.ORGANIZER), getLatestCsvImportStatus);
router.get(
  '/csv/:id/errors',
  requireRole(Roles.ORGANIZER),
  validateUuidParam('id'),
  validateCsvImportErrorQuery,
  getCsvImportJobErrors
);

export default router;
