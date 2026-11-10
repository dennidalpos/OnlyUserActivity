const fs = require('fs');
const path = require('path');
const { ensureDir, readPackageJson, resolveArtifactsPath } = require('./utils');

const sourceDir = resolveArtifactsPath('packages');
const publishDir = ensureDir(resolveArtifactsPath('publish'));

if (!fs.existsSync(sourceDir)) {
  throw new Error('No packaged artifacts found. Run npm run pack first.');
}

const packageFiles = fs.readdirSync(sourceDir)
  .filter(fileName => fs.statSync(path.join(sourceDir, fileName)).isFile())
  .sort((left, right) => left.localeCompare(right));

if (packageFiles.length === 0) {
  throw new Error('No packaged artifacts found. Run npm run pack first.');
}

for (const fileName of packageFiles) {
  fs.copyFileSync(path.join(sourceDir, fileName), path.join(publishDir, fileName));
}

const packageJson = readPackageJson();
const manifest = {
  schema_version: 1,
  package_name: packageJson.name,
  package_version: packageJson.version,
  source: 'artifacts/packages',
  files: packageFiles
};

fs.writeFileSync(
  path.join(publishDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);

console.log(`Published ${packageFiles.length} artifact(s) to ${publishDir}.`);
