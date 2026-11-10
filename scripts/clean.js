const fs = require('fs/promises');
const path = require('path');

const targets = [
  path.join('artifacts', 'build'),
  path.join('artifacts', 'packages'),
  path.join('artifacts', 'publish'),
  path.join('artifacts', 'logs'),
  path.join('artifacts', 'test-results'),
  'coverage',
  'logs',
  'test-data',
  'build',
  'dist',
  'out',
  'publish',
  'tmp',
  path.join('public', 'build')
];

async function removeTarget(target) {
  const fullPath = path.join(process.cwd(), target);
  await fs.rm(fullPath, { recursive: true, force: true });
  console.log(`removed ${target}`);
}

async function main() {
  for (const target of targets) {
    await removeTarget(target);
  }

  console.log('clean completed; data/ was preserved');
}

main().catch(error => {
  console.error('clean failed:', error.message);
  process.exit(1);
});
