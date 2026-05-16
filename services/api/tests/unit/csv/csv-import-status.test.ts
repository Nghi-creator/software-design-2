import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, PassThrough } from 'node:stream';
import test from 'node:test';
import csv from 'csv-parser';
import { runCsvImportFromFile } from '../../../src/services/importStatus';

test('CSV import reports row errors without stopping the whole import', async () => {
  const filePath = path.join(os.tmpdir(), `students-${Date.now()}.csv`);
  await fsPromises.writeFile(
    filePath,
    [
      'studentId,name,email',
      'S001,Alice,alice@example.com',
      'S001,Alice Updated,alice.updated@example.com',
      'S002,Bob,',
      'S003,Invalid Email,invalid-email',
      'S004,Database Error,boom@example.com'
    ].join('\n')
  );

  const students = new Map<string, { name: string; email: string }>();
  const rowErrors: Array<{ rowNumber: number; studentId?: string; email?: string; error: string }> = [];

  const result = await runCsvImportFromFile(filePath, {
    query: async (text, params = []) => {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.startsWith('insert into csv_import_jobs')) {
        return {
          rows: [
            {
              id: 'job-1',
              source: params[0],
              status: 'RUNNING',
              startedAt: new Date('2026-05-15T00:00:00.000Z'),
              finishedAt: null,
              totalRows: 0,
              successCount: 0,
              errorCount: 0,
              message: null
            }
          ]
        };
      }

      if (sql.startsWith('update csv_import_jobs')) {
        const [jobId, status, totalRows, successCount, errorCount, message] = params;
        return {
          rows: [
            {
              id: jobId,
              source: filePath,
              status,
              startedAt: new Date('2026-05-15T00:00:00.000Z'),
              finishedAt: new Date('2026-05-15T00:01:00.000Z'),
              totalRows,
              successCount,
              errorCount,
              message
            }
          ]
        };
      }

      if (sql.startsWith('insert into csv_import_errors')) {
        const [_jobId, rowNumber, studentId, email, error] = params;
        rowErrors.push({
          rowNumber: rowNumber as number,
          studentId: studentId as string,
          email: email as string,
          error: error as string
        });
        return {
          rows: [
            {
              id: `error-${rowErrors.length}`,
              jobId: _jobId,
              rowNumber,
              studentId,
              email,
              error,
              rawRow: {},
              createdAt: new Date('2026-05-15T00:00:00.000Z')
            }
          ]
        };
      }

      if (sql.startsWith('insert into users')) {
        const [studentId, name, email] = params as [string, string, string];

        if (email === 'boom@example.com') {
          throw new Error('duplicate email');
        }

        students.set(studentId, { name, email });
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${sql}`);
    },
    fileExists: fs.existsSync,
    createReadStream: fs.createReadStream,
    createCsvParser: () => csv()
  });

  await fsPromises.unlink(filePath);

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.totalRows, 5);
  assert.equal(result.successCount, 2);
  assert.equal(result.errorCount, 3);
  assert.equal(students.get('S001')?.email, 'alice.updated@example.com');
  assert.deepEqual(rowErrors.map((error) => error.rowNumber), [4, 5, 6]);
  assert.deepEqual(rowErrors.map((error) => error.error), [
    'email is required',
    'email must be valid',
    'duplicate email'
  ]);
});

test('CSV import marks the job failed when the scheduled export file is missing', async () => {
  const filePath = path.join(os.tmpdir(), `missing-students-${Date.now()}.csv`);
  const finishedJobs: Array<{
    status: string;
    totalRows: number;
    successCount: number;
    errorCount: number;
    message: string | null;
  }> = [];

  const result = await runCsvImportFromFile(filePath, {
    query: async (text, params = []) => {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.startsWith('insert into csv_import_jobs')) {
        return {
          rows: [
            {
              id: 'job-missing',
              source: params[0],
              status: 'RUNNING',
              startedAt: new Date('2026-05-15T00:00:00.000Z'),
              finishedAt: null,
              totalRows: 0,
              successCount: 0,
              errorCount: 0,
              message: null
            }
          ]
        };
      }

      if (sql.startsWith('update csv_import_jobs')) {
        const [_jobId, status, totalRows, successCount, errorCount, message] = params as [
          string,
          string,
          number,
          number,
          number,
          string | null
        ];
        finishedJobs.push({ status, totalRows, successCount, errorCount, message: message as string | null });

        return {
          rows: [
            {
              id: 'job-missing',
              source: filePath,
              status,
              startedAt: new Date('2026-05-15T00:00:00.000Z'),
              finishedAt: new Date('2026-05-15T00:01:00.000Z'),
              totalRows,
              successCount,
              errorCount,
              message
            }
          ]
        };
      }

      throw new Error(`Unexpected query: ${sql}`);
    },
    fileExists: () => false,
    createReadStream: fs.createReadStream,
    createCsvParser: () => csv()
  });

  assert.equal(result.status, 'FAILED');
  assert.deepEqual(finishedJobs, [
    {
      status: 'FAILED',
      totalRows: 0,
      successCount: 0,
      errorCount: 1,
      message: 'CSV file not found'
    }
  ]);
});

test('CSV import marks the job failed when the CSV stream cannot be parsed', async () => {
  const filePath = path.join(os.tmpdir(), `broken-students-${Date.now()}.csv`);

  const result = await runCsvImportFromFile(filePath, {
    query: async (text, params = []) => {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.startsWith('insert into csv_import_jobs')) {
        return {
          rows: [
            {
              id: 'job-broken',
              source: params[0],
              status: 'RUNNING',
              startedAt: new Date('2026-05-15T00:00:00.000Z'),
              finishedAt: null,
              totalRows: 0,
              successCount: 0,
              errorCount: 0,
              message: null
            }
          ]
        };
      }

      if (sql.startsWith('update csv_import_jobs')) {
        const [_jobId, status, totalRows, successCount, errorCount, message] = params as [
          string,
          string,
          number,
          number,
          number,
          string | null
        ];

        return {
          rows: [
            {
              id: 'job-broken',
              source: filePath,
              status,
              startedAt: new Date('2026-05-15T00:00:00.000Z'),
              finishedAt: new Date('2026-05-15T00:01:00.000Z'),
              totalRows,
              successCount,
              errorCount,
              message
            }
          ]
        };
      }

      throw new Error(`Unexpected query: ${sql}`);
    },
    fileExists: () => true,
    createReadStream: (() => Readable.from([
      'studentId,name,email\nS001,Alice,alice@example.com\n'
    ])) as unknown as typeof fs.createReadStream,
    createCsvParser: () => {
      const stream = new PassThrough({ objectMode: true });

      queueMicrotask(() => stream.emit('error', new Error('malformed CSV export')));

      return stream;
    }
  });

  assert.equal(result.status, 'FAILED');
  assert.equal(result.totalRows, 0);
  assert.equal(result.successCount, 0);
  assert.equal(result.errorCount, 1);
  assert.equal(result.message, 'malformed CSV export');
});
