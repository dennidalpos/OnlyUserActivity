const path = require('path');
const { runCommand } = require('./utils');

const node = process.execPath;

runCommand(node, [path.join('scripts', 'doctor.js')], { shell: false });
runCommand(node, [path.join('scripts', 'compile.js')], { shell: false });

console.log('Build completed. Runtime project verified without additional compilation.');
