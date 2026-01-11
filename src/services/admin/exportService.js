const { writeToString, format: csvFormat } = require('@fast-csv/format');
const ExcelJS = require('exceljs');
const { PassThrough } = require('stream');
const userStorage = require('../storage/userStorage');
const activityStorage = require('../storage/activityStorage');
const { calculateDuration } = require('../utils/timeUtils');

class ExportService {
  async exportActivities(userKeys, fromDate, toDate, format = 'csv', exportType = 'detailed') {
    if (userKeys.includes('all') || userKeys[0] === 'all') {
      const allUsers = await userStorage.listAll();
      userKeys = allUsers.map(u => u.userKey);
    }

    const allActivities = [];
    const userSummaries = [];

    for (const userKey of userKeys) {
      const user = await userStorage.findByUserKey(userKey);
      if (!user) continue;

      const activities = await activityStorage.findByRange(userKey, fromDate, toDate);

      const metadataValue = user.metadata || {};

      let totalMinutes = 0;

      activities.forEach(act => {
        const duration = calculateDuration(act.startTime, act.endTime);
        totalMinutes += duration;

        allActivities.push({
          username: user.username,
          displayName: user.displayName,
          userType: user.userType || 'local',
          email: user.email || '',
          department: user.department || '',
          shift: user.shift || '',
          createdAt: user.createdAt || '',
          lastLoginAt: user.lastLoginAt || '',
          updatedAt: user.updatedAt || '',
          metadata: metadataValue,
          date: act.date,
          startTime: act.startTime,
          endTime: act.endTime,
          durationMinutes: duration,
          durationHours: (duration / 60).toFixed(2),
          activityType: act.activityType,
          customType: act.customType || '',
          notes: act.notes || ''
        });
      });

      userSummaries.push({
        username: user.username,
        displayName: user.displayName,
        userType: user.userType || 'local',
        email: user.email || '',
        department: user.department || '',
        shift: user.shift || '',
        createdAt: user.createdAt || '',
        lastLoginAt: user.lastLoginAt || '',
        updatedAt: user.updatedAt || '',
        metadata: metadataValue,
        totalActivities: activities.length,
        totalMinutes,
        totalHours: (totalMinutes / 60).toFixed(2),
        avgHoursPerDay: activities.length > 0 ? ((totalMinutes / 60) / this.countUniqueDays(activities)).toFixed(2) : 0
      });
    }

    allActivities.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.username.localeCompare(b.username);
    });

    if (format === 'xlsx') {
      return await this.generateExcel(allActivities, userSummaries, fromDate, toDate, exportType);
    }

    if (format === 'json') {
      const data = exportType === 'summary' ? userSummaries : allActivities;
      return {
        data: JSON.stringify(data, null, 2),
        contentType: 'application/json'
      };
    }

    return await this.generateCSV(exportType === 'summary' ? userSummaries : allActivities, exportType);
  }

  async generateCSV(data, exportType) {
    let fields;

    if (exportType === 'summary') {
      fields = [
        { label: 'Username', value: 'username' },
        { label: 'Nome Completo', value: 'displayName' },
        { label: 'Tipo Utente', value: 'userType' },
        { label: 'Email', value: 'email' },
        { label: 'Reparto', value: 'department' },
        { label: 'Turno', value: 'shift' },
        { label: 'Creato il', value: 'createdAt' },
        { label: 'Ultimo accesso', value: 'lastLoginAt' },
        { label: 'Aggiornato il', value: 'updatedAt' },
        { label: 'Metadata', value: 'metadata' },
        { label: 'Totale Attività', value: 'totalActivities' },
        { label: 'Ore Totali', value: 'totalHours' },
        { label: 'Media Ore/Giorno', value: 'avgHoursPerDay' }
      ];
    } else {
      fields = [
        { label: 'Username', value: 'username' },
        { label: 'Nome Completo', value: 'displayName' },
        { label: 'Tipo Utente', value: 'userType' },
        { label: 'Email', value: 'email' },
        { label: 'Reparto', value: 'department' },
        { label: 'Turno', value: 'shift' },
        { label: 'Creato il', value: 'createdAt' },
        { label: 'Ultimo accesso', value: 'lastLoginAt' },
        { label: 'Aggiornato il', value: 'updatedAt' },
        { label: 'Metadata', value: 'metadata' },
        { label: 'Data', value: 'date' },
        { label: 'Ora Inizio', value: 'startTime' },
        { label: 'Ora Fine', value: 'endTime' },
        { label: 'Durata (ore)', value: 'durationHours' },
        { label: 'Tipo Attività', value: 'activityType' },
        { label: 'Tipo Custom', value: 'customType' },
        { label: 'Note', value: 'notes' }
      ];
    }

    const rows = data.map(item => fields.reduce((acc, field) => {
      const value = field.value === 'metadata' ? this.formatMetadataValue(item[field.value]) : item[field.value];
      acc[field.label] = value;
      return acc;
    }, {}));
    const csv = await writeToString(rows, { headers: true });

    return {
      data: csv,
      contentType: 'text/csv'
    };
  }

  async generateExcel(activities, summaries, fromDate, toDate, exportType) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Activity Tracker';
    workbook.created = new Date();

    if (exportType !== 'summary') {
      const detailSheet = workbook.addWorksheet('Dettaglio Attività');

      detailSheet.columns = [
        { header: 'Username', key: 'username', width: 15 },
        { header: 'Nome Completo', key: 'displayName', width: 25 },
        { header: 'Tipo Utente', key: 'userType', width: 12 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Reparto', key: 'department', width: 18 },
        { header: 'Turno', key: 'shift', width: 18 },
        { header: 'Creato il', key: 'createdAt', width: 20 },
        { header: 'Ultimo accesso', key: 'lastLoginAt', width: 20 },
        { header: 'Aggiornato il', key: 'updatedAt', width: 20 },
        { header: 'Metadata', key: 'metadata', width: 28 },
        { header: 'Data', key: 'date', width: 12 },
        { header: 'Ora Inizio', key: 'startTime', width: 12 },
        { header: 'Ora Fine', key: 'endTime', width: 12 },
        { header: 'Ore', key: 'durationHours', width: 10 },
        { header: 'Tipo Attività', key: 'activityType', width: 20 },
        { header: 'Tipo Custom', key: 'customType', width: 20 },
        { header: 'Note', key: 'notes', width: 30 }
      ];

      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      activities.forEach(act => {
        detailSheet.addRow({
          ...act,
          metadata: this.formatMetadataValue(act.metadata)
        });
      });

      detailSheet.autoFilter = {
        from: 'A1',
        to: 'Q1'
      };
    }

    const summarySheet = workbook.addWorksheet('Riepilogo Utenti');

    summarySheet.columns = [
      { header: 'Username', key: 'username', width: 15 },
      { header: 'Nome Completo', key: 'displayName', width: 25 },
      { header: 'Tipo Utente', key: 'userType', width: 12 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Reparto', key: 'department', width: 18 },
      { header: 'Turno', key: 'shift', width: 18 },
      { header: 'Creato il', key: 'createdAt', width: 20 },
      { header: 'Ultimo accesso', key: 'lastLoginAt', width: 20 },
      { header: 'Aggiornato il', key: 'updatedAt', width: 20 },
      { header: 'Metadata', key: 'metadata', width: 28 },
      { header: 'Totale Attività', key: 'totalActivities', width: 15 },
      { header: 'Ore Totali', key: 'totalHours', width: 12 },
      { header: 'Media Ore/Giorno', key: 'avgHoursPerDay', width: 15 }
    ];

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    summaries.forEach(summary => {
      summarySheet.addRow({
        ...summary,
        metadata: this.formatMetadataValue(summary.metadata)
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  countUniqueDays(activities) {
    const uniqueDates = new Set(activities.map(a => a.date));
    return uniqueDates.size;
  }

  formatMetadataValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * Stream-based export for large datasets (CSV only)
   * Returns a readable stream instead of buffering all data in memory
   */
  async createExportStream(userKeys, fromDate, toDate, exportType = 'detailed') {
    if (userKeys.includes('all') || userKeys[0] === 'all') {
      const allUsers = await userStorage.listAll();
      userKeys = allUsers.map(u => u.userKey);
    }

    const passThrough = new PassThrough();
    const csvStream = csvFormat({ headers: true });
    csvStream.pipe(passThrough);

    const fields = exportType === 'summary'
      ? this.getSummaryFields()
      : this.getDetailedFields();

    // Process users one by one to avoid memory buildup
    (async () => {
      try {
        for (const userKey of userKeys) {
          const user = await userStorage.findByUserKey(userKey);
          if (!user) continue;

          const activities = await activityStorage.findByRange(userKey, fromDate, toDate);
          const metadataValue = user.metadata || {};

          if (exportType === 'summary') {
            let totalMinutes = 0;
            activities.forEach(act => {
              totalMinutes += calculateDuration(act.startTime, act.endTime);
            });

            const row = this.formatRow({
              username: user.username,
              displayName: user.displayName,
              userType: user.userType || 'local',
              email: user.email || '',
              department: user.department || '',
              shift: user.shift || '',
              createdAt: user.createdAt || '',
              lastLoginAt: user.lastLoginAt || '',
              updatedAt: user.updatedAt || '',
              metadata: metadataValue,
              totalActivities: activities.length,
              totalMinutes,
              totalHours: (totalMinutes / 60).toFixed(2),
              avgHoursPerDay: activities.length > 0 ? ((totalMinutes / 60) / this.countUniqueDays(activities)).toFixed(2) : 0
            }, fields);
            csvStream.write(row);
          } else {
            for (const act of activities) {
              const duration = calculateDuration(act.startTime, act.endTime);
              const row = this.formatRow({
                username: user.username,
                displayName: user.displayName,
                userType: user.userType || 'local',
                email: user.email || '',
                department: user.department || '',
                shift: user.shift || '',
                createdAt: user.createdAt || '',
                lastLoginAt: user.lastLoginAt || '',
                updatedAt: user.updatedAt || '',
                metadata: metadataValue,
                date: act.date,
                startTime: act.startTime,
                endTime: act.endTime,
                durationMinutes: duration,
                durationHours: (duration / 60).toFixed(2),
                activityType: act.activityType,
                customType: act.customType || '',
                notes: act.notes || ''
              }, fields);
              csvStream.write(row);
            }
          }
        }
        csvStream.end();
      } catch (error) {
        passThrough.destroy(error);
      }
    })();

    return passThrough;
  }

  getSummaryFields() {
    return [
      { label: 'Username', value: 'username' },
      { label: 'Nome Completo', value: 'displayName' },
      { label: 'Tipo Utente', value: 'userType' },
      { label: 'Email', value: 'email' },
      { label: 'Reparto', value: 'department' },
      { label: 'Turno', value: 'shift' },
      { label: 'Creato il', value: 'createdAt' },
      { label: 'Ultimo accesso', value: 'lastLoginAt' },
      { label: 'Aggiornato il', value: 'updatedAt' },
      { label: 'Metadata', value: 'metadata' },
      { label: 'Totale Attività', value: 'totalActivities' },
      { label: 'Ore Totali', value: 'totalHours' },
      { label: 'Media Ore/Giorno', value: 'avgHoursPerDay' }
    ];
  }

  getDetailedFields() {
    return [
      { label: 'Username', value: 'username' },
      { label: 'Nome Completo', value: 'displayName' },
      { label: 'Tipo Utente', value: 'userType' },
      { label: 'Email', value: 'email' },
      { label: 'Reparto', value: 'department' },
      { label: 'Turno', value: 'shift' },
      { label: 'Creato il', value: 'createdAt' },
      { label: 'Ultimo accesso', value: 'lastLoginAt' },
      { label: 'Aggiornato il', value: 'updatedAt' },
      { label: 'Metadata', value: 'metadata' },
      { label: 'Data', value: 'date' },
      { label: 'Ora Inizio', value: 'startTime' },
      { label: 'Ora Fine', value: 'endTime' },
      { label: 'Durata (ore)', value: 'durationHours' },
      { label: 'Tipo Attività', value: 'activityType' },
      { label: 'Tipo Custom', value: 'customType' },
      { label: 'Note', value: 'notes' }
    ];
  }

  formatRow(item, fields) {
    return fields.reduce((acc, field) => {
      const value = field.value === 'metadata' ? this.formatMetadataValue(item[field.value]) : item[field.value];
      acc[field.label] = value;
      return acc;
    }, {});
  }
}

module.exports = new ExportService();
