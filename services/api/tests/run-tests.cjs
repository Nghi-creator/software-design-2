const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

process.env.NODE_ENV = 'test';

const collectTests = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const fullPath = join(directory, entry.name);

  if (entry.isDirectory()) {
    return collectTests(fullPath);
  }

  return entry.name.endsWith('.test.ts') ? [fullPath] : [];
});

const run = (args) => {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run([require.resolve('typescript/bin/tsc'), '--noEmit']);
run([
  '--test',
  '--test-timeout=60000',
  '-r',
  'ts-node/register',
  ...collectTests(join(__dirname))
]);
