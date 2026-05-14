import cron from 'node-cron';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { query } from '../lib/db';

export const startCsvSyncJob = () => {
  // Run everyday at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting CSV Sync Job...');
    const filePath = path.join(__dirname, '../../data/students.csv');

    if (!fs.existsSync(filePath)) {
      console.log('CSV file not found, skipping sync.');
      return;
    }

    const students: any[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => students.push(data))
      .on('end', async () => {
        let successCount = 0;
        let errorCount = 0;

        for (const student of students) {
          try {
            await query(
              `
                insert into users (student_id, name, email, role)
                values ($1, $2, $3, 'STUDENT')
                on conflict (student_id)
                do update set name = excluded.name, email = excluded.email
              `,
              [student.studentId, student.name, student.email]
            );
            successCount++;
          } catch (error) {
            console.error(`Failed to sync student ${student.studentId}:`, error);
            errorCount++;
          }
        }
        console.log(`CSV Sync Completed. Success: ${successCount}, Errors: ${errorCount}`);
      });
  });
};
