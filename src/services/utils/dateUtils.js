function getCurrentDate() {
  const now = new Date();
  return formatDate(now);
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

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isFutureDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

module.exports = {
  getCurrentDate,
  formatDate,
  extractYearMonth,
  getMonthRange,
  daysBetween,
  isFutureDate,
  addDays
};
