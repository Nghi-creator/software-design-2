import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { startCsvSyncJob } from './jobs/csvSync';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startCsvSyncJob();
});
