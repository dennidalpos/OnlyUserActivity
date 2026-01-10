const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');

class ServerService {
  constructor() {
    this.startTime = new Date().toISOString();
  }

  async restartServer() {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const currentPid = process.pid;

      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║           RIAVVIO SERVER RICHIESTO                        ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log(`[RESTART] PID corrente: ${currentPid}`);
      console.log(`[RESTART] Platform: ${process.platform}`);
      console.log(`[RESTART] Timestamp: ${new Date().toISOString()}`);

      resolve({ success: true, message: 'Server restart initiated' });

      setTimeout(() => {
        try {
          if (isWindows) {
            const projectDir = path.join(__dirname, '..', '..', '..');
            console.log(`[RESTART] Avvio processo di riavvio per Windows...`);
            console.log(`[RESTART] Directory progetto: ${projectDir}`);

            const restartCmd = `taskkill /F /PID ${currentPid} & timeout /T 3 /NOBREAK & cd /d "${projectDir}" & npm start`;
            console.log(`[RESTART] Comando: ${restartCmd}`);

            spawn('cmd.exe', ['/c', restartCmd], {
              detached: true,
              stdio: 'ignore',
              cwd: projectDir
            }).unref();

            console.log('[RESTART] Processo di riavvio lanciato con successo');
          } else {
            const projectDir = path.join(__dirname, '..', '..', '..');
            console.log(`[RESTART] Avvio processo di riavvio per Unix/Linux...`);
            console.log(`[RESTART] Directory progetto: ${projectDir}`);

            const restartScript = `sleep 3 && cd "${projectDir}" && npm start`;
            console.log(`[RESTART] Comando: kill -SIGTERM ${currentPid} && ${restartScript}`);

            spawn('sh', ['-c', restartScript], {
              detached: true,
              stdio: 'ignore',
              cwd: projectDir
            }).unref();

            console.log('[RESTART] Processo di riavvio lanciato con successo');

            setTimeout(() => {
              process.kill(currentPid, 'SIGTERM');
            }, 500);
          }
        } catch (error) {
          console.error('╔═══════════════════════════════════════════════════════════╗');
          console.error('║           ERRORE DURANTE IL RIAVVIO                       ║');
          console.error('╚═══════════════════════════════════════════════════════════╝');
          console.error('[RESTART ERROR]', error);
          console.error('[RESTART ERROR] Stack:', error.stack);
        }
      }, 1000);
    });
  }

  getServerInfo() {
    return {
      hostname: os.hostname(),
      env: process.env.NODE_ENV || 'production',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: this.formatUptime(process.uptime()),
      memoryUsage: this.formatMemoryUsage(process.memoryUsage()),
      pid: process.pid,
      startTime: this.startTime
    };
  }

  formatMemoryUsage(usage) {
    if (!usage) {
      return '-';
    }
    const toMb = (value) => `${(value / 1024 / 1024).toFixed(2)} MB`;
    return `RSS ${toMb(usage.rss)} | Heap ${toMb(usage.heapUsed)} / ${toMb(usage.heapTotal)} | External ${toMb(usage.external)}`;
  }

  formatUptime(seconds) {
    const total = Math.floor(seconds || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }
}

module.exports = new ServerService();
