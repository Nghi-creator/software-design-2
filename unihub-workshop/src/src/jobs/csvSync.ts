import cron from 'node-cron';
import fs from 'fs';
import csv from 'csv-parser';
import { prisma } from '../lib/prisma';
import path from 'path';

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
            await prisma.user.upsert({
              where: { studentId: student.studentId },
              update: {
                name: student.name,
                email: student.email
              },
              create: {
                studentId: student.studentId,
                name: student.name,
                email: student.email,
                role: 'STUDENT'
              }
            });
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
