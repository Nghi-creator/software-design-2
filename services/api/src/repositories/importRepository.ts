import { CsvImportDependencies, csvImportDependencies } from '../di';

export type CsvImportStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export type CsvImportJob = {
  id: string;
  source: string;
  status: CsvImportStatus;
  startedAt: Date;
  finishedAt: Date | null;
  totalRows: number;
  successCount: number;
  errorCount: number;
  message: string | null;
};

export type CsvImportError = {
  id: string;
  jobId: string;
  rowNumber: number;
  studentId: string | null;
  email: string | null;
  error: string;
  rawRow: Record<string, unknown>;
  createdAt: Date;
};

const mapJobRow = (row: any): CsvImportJob => ({
  id: row.id,
  source: row.source,
  status: row.status,
  startedAt: row.startedAt,
  finishedAt: row.finishedAt,
  totalRows: Number(row.totalRows),
  successCount: Number(row.successCount),
  errorCount: Number(row.errorCount),
  message: row.message
});

const mapErrorRow = (row: any): CsvImportError => ({
  id: row.id,
  jobId: row.jobId,
  rowNumber: Number(row.rowNumber),
  studentId: row.studentId,
  email: row.email,
  error: row.error,
  rawRow: row.rawRow ?? {},
  createdAt: row.createdAt
});

export const createCsvImportJob = async (
  source: string,
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  const result = await dependencies.query(
    `
      insert into csv_import_jobs (source, status)
      values ($1, 'RUNNING')
      returning
        id,
        source,
        status,
        started_at as "startedAt",
        finished_at as "finishedAt",
        total_rows as "totalRows",
        success_count as "successCount",
        error_count as "errorCount",
        message
    `,
    [source]
  );

  return mapJobRow(result.rows[0]);
};

export const finishCsvImportJob = async (
  {
    jobId,
    status,
    totalRows,
    successCount,
    errorCount,
    message
  }: {
    jobId: string;
    status: CsvImportStatus;
    totalRows: number;
    successCount: number;
    errorCount: number;
    message?: string;
  },
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  const result = await dependencies.query(
    `
      update csv_import_jobs
      set
        status = $2,
        finished_at = now(),
        total_rows = $3,
        success_count = $4,
        error_count = $5,
        message = $6
      where id = $1
      returning
        id,
        source,
        status,
        started_at as "startedAt",
        finished_at as "finishedAt",
        total_rows as "totalRows",
        success_count as "successCount",
        error_count as "errorCount",
        message
    `,
    [jobId, status, totalRows, successCount, errorCount, message ?? null]
  );

  return mapJobRow(result.rows[0]);
};

export const createCsvImportError = async (
  {
    jobId,
    rowNumber,
    studentId,
    email,
    error,
    rawRow
  }: {
    jobId: string;
    rowNumber: number;
    studentId?: string;
    email?: string;
    error: string;
    rawRow: Record<string, unknown>;
  },
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  const result = await dependencies.query(
    `
      insert into csv_import_errors (job_id, row_number, student_id, email, error, raw_row)
      values ($1, $2, $3, $4, $5, $6)
      returning
        id,
        job_id as "jobId",
        row_number as "rowNumber",
        student_id as "studentId",
        email,
        error,
        raw_row as "rawRow",
        created_at as "createdAt"
    `,
    [jobId, rowNumber, studentId ?? null, email ?? null, error, rawRow]
  );

  return mapErrorRow(result.rows[0]);
};

export const upsertCsvStudent = async (
  {
    studentId,
    name,
    email
  }: {
    studentId: string;
    name: string;
    email: string;
  },
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  await dependencies.query(
    `
      insert into users (student_id, name, email, role)
      values ($1, $2, $3, 'STUDENT')
      on conflict (student_id)
      do update set name = excluded.name, email = excluded.email
    `,
    [studentId, name, email]
  );
};

export const findLatestCsvImportJob = async (
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  const result = await dependencies.query(
    `
      select
        id,
        source,
        status,
        started_at as "startedAt",
        finished_at as "finishedAt",
        total_rows as "totalRows",
        success_count as "successCount",
        error_count as "errorCount",
        message
      from csv_import_jobs
      order by started_at desc
      limit 1
    `
  );

  return result.rows[0] ? mapJobRow(result.rows[0]) : null;
};

export const findCsvImportErrors = async (
  jobId: string,
  limit: number,
  offset: number,
  dependencies: CsvImportDependencies = csvImportDependencies
) => {
  const result = await dependencies.query(
    `
      select
        id,
        job_id as "jobId",
        row_number as "rowNumber",
        student_id as "studentId",
        email,
        error,
        raw_row as "rawRow",
        created_at as "createdAt"
      from csv_import_errors
      where job_id = $1
      order by row_number asc, created_at asc
      limit $2 offset $3
    `,
    [jobId, limit, offset]
  );

  return result.rows.map(mapErrorRow);
};
