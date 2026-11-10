const os = require('os');
const config = require('../../config');

class ServerService {
  constructor() {
    this.startTime = new Date().toISOString();
  }

  async restartServer() {
    if (!config.security.allowSupervisorRestart) {
      const error = new Error('Riavvio remoto non supportato senza un supervisore di processo configurato.');
      error.statusCode = 409;
      throw error;
    }

    setTimeout(() => {
      process.exit(0);
    }, 250);

    return {
      success: true,
      message: 'Richiesta di riavvio inoltrata al supervisore di processo.'
    };
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
