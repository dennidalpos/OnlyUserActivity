const fs = require('fs');
const path = require('path');
const { resolveRepoPath } = require('./utils');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2];
    }
  }
  return env;
}

function resolvePath(baseDir, value) {
  if (!value) {
    return null;
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(baseDir, value);
}

const checks = [];
let failed = false;

function ok(message) {
  checks.push(`OK   ${message}`);
}

function warn(message) {
  checks.push(`WARN ${message}`);
}

function fail(message) {
  checks.push(`FAIL ${message}`);
  failed = true;
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 18) {
  ok(`Node.js ${process.versions.node}`);
} else {
  fail(`Node.js ${process.versions.node} is not supported. Require 18+.`);
}

if (fs.existsSync(resolveRepoPath('package-lock.json'))) {
  ok('package-lock.json found');
} else {
  fail('package-lock.json missing');
}

if (fs.existsSync(resolveRepoPath('node_modules'))) {
  ok('Dependencies installed');
} else {
  fail('node_modules missing. Run npm run bootstrap first.');
}

if (fs.existsSync(resolveRepoPath('.env.example'))) {
  ok('.env.example found');
} else {
  fail('.env.example missing');
}

const envPath = path.resolve(
  process.env.ONLYUSERACTIVITY_ENV_PATH
    || process.env.ENV_FILE_PATH
    || resolveRepoPath('.env')
);
const envDir = path.dirname(envPath);
const env = parseEnvFile(envPath);

if (!env) {
  fail(`Environment file missing at ${envPath}`);
} else {
  ok(`Environment file found at ${envPath}`);

  const nodeEnv = env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    if ((env.JWT_SECRET || '') === 'change-me-in-production') {
      fail('JWT_SECRET still uses the default production placeholder');
    }
    if ((env.ADMIN_SESSION_SECRET || '') === 'change-me-in-production') {
      fail('ADMIN_SESSION_SECRET still uses the default production placeholder');
    }
  }

  if ((env.HTTPS_ENABLED || 'false') === 'true') {
    const certPath = resolvePath(envDir, env.HTTPS_CERT_PATH || './certs/cert.pem');
    const keyPath = resolvePath(envDir, env.HTTPS_KEY_PATH || './certs/key.pem');

    if (certPath && fs.existsSync(certPath)) {
      ok(`HTTPS certificate found at ${certPath}`);
    } else {
      fail(`HTTPS certificate missing at ${certPath}`);
    }

    if (keyPath && fs.existsSync(keyPath)) {
      ok(`HTTPS key found at ${keyPath}`);
    } else {
      fail(`HTTPS key missing at ${keyPath}`);
    }
  }
}

const wixTools = ['heat.exe', 'candle.exe', 'light.exe'];
const missingWixTools = wixTools.filter(tool => !fs.existsSync(resolveRepoPath('tools', 'wix314-binaries', tool)));
if (missingWixTools.length === 0) {
  ok('WiX local toolchain available for packaging');
} else {
  warn(`Packaging prerequisites incomplete. Missing WiX tools: ${missingWixTools.join(', ')}`);
}

const nssm64Path = resolveRepoPath('tools', 'nssm', 'win64', 'nssm.exe');
const nssm32Path = resolveRepoPath('tools', 'nssm', 'win32', 'nssm.exe');
if (fs.existsSync(nssm64Path) || fs.existsSync(nssm32Path)) {
  ok('NSSM local binaries available');
} else {
  warn('NSSM local binaries missing. Windows service packaging/install will not work.');
}

for (const line of checks) {
  console.log(line);
}

if (failed) {
  process.exit(1);
}
