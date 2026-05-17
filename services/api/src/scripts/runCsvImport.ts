import path from 'path';
import { runCsvImportFromFile } from '../services/importStatus';

const main = async () => {
  const filePath = path.join(__dirname, '../../data/students.csv');
  const job = await runCsvImportFromFile(filePath);

  console.log(
    `CSV import finished. Status: ${job.status}. Total: ${job.totalRows}. Imported: ${job.successCount}. Errors: ${job.errorCount}.`
  );
};

main().catch((error) => {
  console.error('CSV import failed:', error);
  process.exitCode = 1;
});
