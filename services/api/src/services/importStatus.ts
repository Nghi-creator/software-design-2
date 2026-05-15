import { CsvImportDependencies, csvImportDependencies } from '../di';
import {
  createCsvImportError,
  createCsvImportJob,
  findCsvImportErrors,
  findLatestCsvImportJob,
  finishCsvImportJob,
  upsertCsvStudent
} from '../repositories/importRepository';

type CsvStudentRow = {
  studentId?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

export const runCsvImportFromFile = async (
  filePath: string,
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  const job = await createCsvImportJob(filePath, dependencies);

  if (!dependencies.fileExists(filePath)) {
    return finishCsvImportJob(
      {
        jobId: job.id,
        status: 'FAILED',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        message: 'CSV file not found'
      },
      dependencies
    );
  }

  let rows: CsvStudentRow[];

  try {
    rows = await readCsvRows(filePath, dependencies);
  } catch (error: any) {
    return finishCsvImportJob(
      {
        jobId: job.id,
        status: 'FAILED',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        message: error.message
      },
      dependencies
    );
  }

  let successCount = 0;
  let errorCount = 0;

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;

    try {
      const student = validateCsvStudent(row);
      await upsertCsvStudent(student, dependencies);
      successCount++;
    } catch (error: any) {
      errorCount++;
      await createCsvImportError(
        {
          jobId: job.id,
          rowNumber,
          studentId: normalizeText(row.studentId),
          email: normalizeText(row.email),
          error: error.message,
          rawRow: row
        },
        dependencies
      );
    }
  }

  return finishCsvImportJob(
    {
      jobId: job.id,
      status: 'COMPLETED',
      totalRows: rows.length,
      successCount,
      errorCount,
      message: errorCount > 0 ? 'Completed with row errors' : undefined
    },
    dependencies
  );
};

export const getLatestCsvImport = (
  dependencies: CsvImportDependencies = csvImportDependencies
) => findLatestCsvImportJob(dependencies);

export const getCsvImportErrors = (
  jobId: string,
  limit = 50,
  offset = 0,
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  return findCsvImportErrors(jobId, limit, offset, dependencies);
};

const readCsvRows = (filePath: string, dependencies: CsvImportDependencies = csvImportDependencies) => {
  return new Promise<CsvStudentRow[]>((resolve, reject) => {
    const rows: CsvStudentRow[] = [];

    dependencies.createReadStream(filePath)
      .pipe(dependencies.createCsvParser())
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });
};

const validateCsvStudent = (row: CsvStudentRow) => {
  const studentId = normalizeText(row.studentId);
  const name = normalizeText(row.name);
  const email = normalizeText(row.email);

  if (!studentId) {
    throw new Error('studentId is required');
  }

  if (!name) {
    throw new Error('name is required');
  }

  if (!email) {
    throw new Error('email is required');
  }

  if (!email.includes('@')) {
    throw new Error('email must be valid');
  }

  return { studentId, name, email };
};

const normalizeText = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};
