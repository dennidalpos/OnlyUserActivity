/**
 * Utility per gestione date e timezone
 */

/**
 * Ottiene data corrente in formato YYYY-MM-DD considerando timezone
 * @returns {string}
 */
function getCurrentDate() {
  const now = new Date();
  return formatDate(now);
}

/**
 * Formatta Date object in YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Estrae anno e mese da data YYYY-MM-DD
 * @param {string} dateString
 * @returns {Object} { year: number, month: number }
 */
function extractYearMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return { year, month };
}

/**
 * Ottiene primo e ultimo giorno del mese
 * @param {number} year
 * @param {number} month (1-12)
 * @returns {Object} { firstDay: string, lastDay: string }
 */
function getMonthRange(year, month) {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDayDate = new Date(year, month, 0); // Giorno 0 del mese successivo = ultimo giorno del mese corrente
  const lastDay = formatDate(lastDayDate);
  return { firstDay, lastDay };
}

/**
 * Calcola differenza in giorni tra due date
 * @param {string} date1 - YYYY-MM-DD
 * @param {string} date2 - YYYY-MM-DD
 * @returns {number}
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se una data è nel futuro
 * @param {string} dateString - YYYY-MM-DD
 * @returns {boolean}
 */
function isFutureDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

module.exports = {
  getCurrentDate,
  formatDate,
  extractYearMonth,
  getMonthRange,
  daysBetween,
  isFutureDate
};
