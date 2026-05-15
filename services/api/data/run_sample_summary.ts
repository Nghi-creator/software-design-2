import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateWorkshopSummary } from '../src/services/ai';

async function main() {
  const pdfBuffer = await readFile(join(__dirname, 'sample-workshop-introduction.pdf'));
  const summary = await generateWorkshopSummary(pdfBuffer);

  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
