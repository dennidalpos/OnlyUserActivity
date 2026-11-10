const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = process.cwd();

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function resolveRepoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function resolveArtifactsPath(...segments) {
  return resolveRepoPath('artifacts', ...segments);
}

function readPackageJson() {
  const packageJsonPath = resolveRepoPath('package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function runCommand(command, args, options = {}) {
  let resolvedCommand = command;
  if (process.platform === 'win32') {
    if (command === 'npm') {
      resolvedCommand = 'npm.cmd';
    } else if (command === 'powershell') {
      resolvedCommand = 'powershell.exe';
    }
  }

  const result = spawnSync(resolvedCommand, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

module.exports = {
  ensureDir,
  readPackageJson,
  repoRoot,
  resolveArtifactsPath,
  resolveRepoPath,
  runCommand
};
