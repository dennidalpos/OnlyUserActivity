const path = require('path');
const { ensureDir, resolveArtifactsPath, runCommand } = require('./utils');

const buildRoot = ensureDir(resolveArtifactsPath('build', 'windows-msi'));
const outputRoot = ensureDir(resolveArtifactsPath('packages'));
const powershellScript = path.join('scripts', 'build-msi.ps1');

runCommand('powershell', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  powershellScript,
  '-BuildRoot',
  buildRoot,
  '-OutputRoot',
  outputRoot
]);
