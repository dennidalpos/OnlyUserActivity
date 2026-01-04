const { exec, spawn } = require('child_process');
const path = require('path');

class ServerService {
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
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      pid: process.pid
    };
  }
}

module.exports = new ServerService();
