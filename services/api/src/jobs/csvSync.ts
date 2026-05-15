import cron from 'node-cron';
import path from 'path';
import { runCsvImportFromFile } from '../services/importStatus';

export const startCsvSyncJob = () => {
  // Run everyday at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting CSV Sync Job...');
    const filePath = path.join(__dirname, '../../data/students.csv');

    try {
      const job = await runCsvImportFromFile(filePath);
      console.log(
        `CSV Sync Completed. Status: ${job.status}. Success: ${job.successCount}, Errors: ${job.errorCount}`
      );
    } catch (error) {
      console.error('CSV Sync Job Failed:', error);
    }
  });
};
