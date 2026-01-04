const { exec } = require('child_process');
const path = require('path');

console.log('Restarting server...');

const isWindows = process.platform === 'win32';
const rootDir = path.join(__dirname, '..');

if (isWindows) {
  exec('taskkill /F /IM node.exe', (killError) => {
    setTimeout(() => {
      exec('npm start', { cwd: rootDir }, (startError) => {
        if (startError) {
          console.error('Failed to start server:', startError);
          process.exit(1);
        }
      });
    }, 2000);
  });
} else {
  exec('pkill -f "node.*server.js"', (killError) => {
    setTimeout(() => {
      exec('npm start &', { cwd: rootDir }, (startError) => {
        if (startError) {
          console.error('Failed to start server:', startError);
          process.exit(1);
        }
      });
    }, 2000);
  });
}
