const fs = require('node:fs');
const path = require('node:path');

const allowedModes = new Set(['normal', 'down', 'timeout']);
const mode = process.argv[2];
const keepEvents = process.argv.includes('--keep-events');
const demoDirectory = path.resolve(__dirname, '../demo');
const modePath = path.join(demoDirectory, 'payment-mode.json');
const eventsPath = path.join(demoDirectory, 'payment-events.json');

if (!allowedModes.has(mode)) {
  console.error('Usage: npm run demo:payment:mode -- <normal|down|timeout> [--keep-events]');
  process.exit(1);
}

fs.mkdirSync(demoDirectory, { recursive: true });
fs.writeFileSync(modePath, `${JSON.stringify({ mode }, null, 2)}\n`);

if (!keepEvents) {
  fs.writeFileSync(eventsPath, '[]\n');
}

console.log(`Payment demo mode: ${mode}`);
console.log(`Gateway attempts ${keepEvents ? 'kept' : 'reset'} at ${path.relative(process.cwd(), eventsPath)}`);

if (mode === 'normal') {
  console.log('Paid registrations use the normal mock gateway.');
} else if (mode === 'down') {
  console.log('Paid registrations fail immediately, while non-payment endpoints keep working.');
} else {
  console.log('Paid registrations time out and trip the circuit breaker, while browsing keeps working.');
}
