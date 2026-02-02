function getCurrentDate() {
  const now = new Date();
  return formatDate(now);
}

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractYearMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return { year, month };
}

function getMonthRange(year, month) {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDayDate = new Date(year, month, 0);
  const lastDay = formatDate(lastDayDate);
  return { firstDay, lastDay };
}

function isFutureDate(dateString) {
  const date = parseDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function addDays(dateString, days) {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

module.exports = {
  getCurrentDate,
  formatDate,
  extractYearMonth,
  getMonthRange,
  isFutureDate,
  addDays
};
