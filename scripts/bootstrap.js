const fs = require('fs');
const { resolveRepoPath, runCommand } = require('./utils');

const envPath = resolveRepoPath('.env');

console.log('Installing project dependencies with npm ci...');
runCommand('npm', ['ci']);

if (!fs.existsSync(envPath)) {
  console.log('Bootstrap completed. Create .env from .env.example before running doctor or start.');
} else {
  console.log('Bootstrap completed.');
}
