const { writeToString } = require('@fast-csv/format');
const ExcelJS = require('exceljs');
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

      let totalMinutes = 0;

      activities.forEach(act => {
        const duration = calculateDuration(act.startTime, act.endTime);
        totalMinutes += duration;

        allActivities.push({
          username: user.username,
          displayName: user.displayName,
          userType: user.userType || 'local',
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
        { label: 'Totale Attività', value: 'totalActivities' },
        { label: 'Ore Totali', value: 'totalHours' },
        { label: 'Media Ore/Giorno', value: 'avgHoursPerDay' }
      ];
    } else {
      fields = [
        { label: 'Username', value: 'username' },
        { label: 'Nome Completo', value: 'displayName' },
        { label: 'Tipo Utente', value: 'userType' },
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
      acc[field.label] = item[field.value];
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
        detailSheet.addRow(act);
      });

      detailSheet.autoFilter = {
        from: 'A1',
        to: 'J1'
      };
    }

    const summarySheet = workbook.addWorksheet('Riepilogo Utenti');

    summarySheet.columns = [
      { header: 'Username', key: 'username', width: 15 },
      { header: 'Nome Completo', key: 'displayName', width: 25 },
      { header: 'Tipo Utente', key: 'userType', width: 12 },
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
      summarySheet.addRow(summary);
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
}

module.exports = new ExportService();
