const auditLogger = require('../../services/storage/auditLogger');
const { AppError } = require('../../middlewares/errorHandler');
const { getCurrentDate } = require('../../services/utils/dateUtils');

function summarizeKeys(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  return Object.keys(payload);
}

function normalizeAdminApiError(error) {
  if (error instanceof AppError) {
    return error;
  }

  const message = error?.message || 'Errore interno del server';

  if (message.includes('non trovato')) {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  if (message.includes('già esistente')) {
    return new AppError(message, 409, 'CONFLICT');
  }

  if (message.includes('Non è possibile')) {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  if (
    message.includes('obbligatori')
    || message.includes('obbligatoria')
    || message.includes('non valido')
    || message.includes('non valida')
    || message.includes('priva')
    || message.includes('Seleziona')
    || message.includes('mancanti')
    || message.includes('deve')
  ) {
    return new AppError(message, 400, 'VALIDATION_ERROR');
  }

  const normalized = new AppError(message, error?.statusCode || 500, error?.code || 'INTERNAL_ERROR');
  normalized.details = error?.details || null;
  return normalized;
}

function sendAdminApiError(res, error) {
  const normalized = normalizeAdminApiError(error);
  return res.status(normalized.statusCode).json({
    success: false,
    error: normalized.message,
    code: normalized.code
  });
}

function renderAdminError(res, error) {
  return res.render('errors/error', {
    title: 'Errore',
    error: error.message
  });
}

function calculateDateRange(date, viewMode) {
  const d = new Date(`${date}T00:00:00`);
  let fromDate;
  let toDate;

  if (viewMode === 'week') {
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    fromDate = monday.toISOString().split('T')[0];
    toDate = sunday.toISOString().split('T')[0];
  } else if (viewMode === 'month') {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();

    fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else if (viewMode === 'year') {
    const year = d.getFullYear();
    const today = getCurrentDate();
    const currentYear = today.split('-')[0];

    fromDate = `${year}-01-01`;
    toDate = year === Number(currentYear)
      ? today
      : `${year}-12-31`;
  } else {
    fromDate = date;
    toDate = date;
  }

  return { fromDate, toDate };
}

function formatExportTimestamp(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year}-${hour}-${minute}`;
}

function buildExportFilename({ timestamp, ext }) {
  const repoName = 'OnlyUserActivity';
  const formatted = formatExportTimestamp(timestamp);
  return `${repoName}-${formatted}.${ext}`;
}

async function auditAdminAction(req, action, payload = {}) {
  return auditLogger.log(
    action,
    'admin',
    payload,
    req.id,
    req.ip,
    req.adminUser.username
  );
}

module.exports = {
  summarizeKeys,
  sendAdminApiError,
  renderAdminError,
  calculateDateRange,
  buildExportFilename,
  auditAdminAction
};
