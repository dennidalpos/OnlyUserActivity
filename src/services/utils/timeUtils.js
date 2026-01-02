/**
 * Utility per gestione orari e date
 */

/**
 * Valida che l'orario sia multiplo di 15 minuti
 * @param {string} timeString - Orario in formato HH:MM
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateTimeStep(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return { valid: false, error: 'Orario non valido' };
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const match = timeString.match(timeRegex);

  if (!match) {
    return { valid: false, error: 'Formato orario non valido. Usare HH:MM' };
  }

  const [, hours, minutes] = match;
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);

  if (h < 0 || h > 23) {
    return { valid: false, error: 'Ore devono essere tra 00 e 23' };
  }

  if (![0, 15, 30, 45].includes(m)) {
    return { valid: false, error: 'I minuti devono essere 00, 15, 30 o 45' };
  }

  return { valid: true };
}

/**
 * Converte stringa orario in minuti dal mezzogiorno
 * @param {string} timeString - Orario HH:MM
 * @returns {number} Minuti
 */
function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte minuti in stringa orario
 * @param {number} minutes - Minuti dal mezzogiorno
 * @returns {string} Orario HH:MM
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Valida formato data YYYY-MM-DD
 * @param {string} dateString - Data
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateDateFormat(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return { valid: false, error: 'Data non valida' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return { valid: false, error: 'Formato data non valido. Usare YYYY-MM-DD' };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Data non valida' };
  }

  // Verifica che la data corrisponda alla stringa (evita 2024-02-31)
  const [year, month, day] = dateString.split('-').map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return { valid: false, error: 'Data non valida' };
  }

  return { valid: true };
}

/**
 * Calcola durata in minuti tra due orari
 * @param {string} startTime - HH:MM
 * @param {string} endTime - HH:MM
 * @returns {number} Durata in minuti
 */
function calculateDuration(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (end <= start) {
    return 0; // Gestisce anche caso di attraversamento mezzanotte
  }

  return end - start;
}

/**
 * Arrotonda minuti al quarto d'ora più vicino
 * @param {number} minutes
 * @returns {number}
 */
function roundToQuarterHour(minutes) {
  return Math.round(minutes / 15) * 15;
}

module.exports = {
  validateTimeStep,
  timeToMinutes,
  minutesToTime,
  validateDateFormat,
  calculateDuration,
  roundToQuarterHour
};
