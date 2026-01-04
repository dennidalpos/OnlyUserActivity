// Servizio per gestione festività e weekend
class HolidayService {
  constructor() {
    // Festività italiane fisse
    this.fixedHolidays = [
      { month: 1, day: 1, name: 'Capodanno' },
      { month: 1, day: 6, name: 'Epifania' },
      { month: 4, day: 25, name: 'Festa della Liberazione' },
      { month: 5, day: 1, name: 'Festa del Lavoro' },
      { month: 6, day: 2, name: 'Festa della Repubblica' },
      { month: 8, day: 15, name: 'Ferragosto' },
      { month: 11, day: 1, name: 'Ognissanti' },
      { month: 12, day: 8, name: 'Immacolata Concezione' },
      { month: 12, day: 25, name: 'Natale' },
      { month: 12, day: 26, name: 'Santo Stefano' }
    ];
  }

  /**
   * Calcola la Pasqua usando l'algoritmo di Meeus/Jones/Butcher
   * @param {number} year - Anno
   * @returns {Date} Data della Pasqua
   */
  calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month - 1, day);
  }

  /**
   * Ottiene tutte le festività per un anno
   * @param {number} year - Anno
   * @returns {Array} Array di date festive
   */
  getHolidaysForYear(year) {
    const holidays = [];

    // Aggiungi festività fisse
    this.fixedHolidays.forEach(holiday => {
      holidays.push({
        date: new Date(year, holiday.month - 1, holiday.day),
        name: holiday.name,
        type: 'fixed'
      });
    });

    // Aggiungi Pasqua e Lunedì dell'Angelo
    const easter = this.calculateEaster(year);
    holidays.push({
      date: easter,
      name: 'Pasqua',
      type: 'mobile'
    });

    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    holidays.push({
      date: easterMonday,
      name: 'Lunedì dell\'Angelo',
      type: 'mobile'
    });

    return holidays;
  }

  /**
   * Verifica se una data è una festività
   * @param {string} dateStr - Data in formato YYYY-MM-DD
   * @returns {Object|null} Info festività o null
   */
  isHoliday(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const holidays = this.getHolidaysForYear(year);

    for (const holiday of holidays) {
      if (holiday.date.getMonth() + 1 === month && holiday.date.getDate() === day) {
        return {
          name: holiday.name,
          type: holiday.type
        };
      }
    }

    return null;
  }

  /**
   * Verifica se una data è un weekend
   * @param {string} dateStr - Data in formato YYYY-MM-DD
   * @returns {Object|null} Info weekend o null
   */
  isWeekend(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0 = Domenica, 6 = Sabato

    if (dayOfWeek === 0) {
      return { name: 'Domenica', type: 'weekend' };
    } else if (dayOfWeek === 6) {
      return { name: 'Sabato', type: 'weekend' };
    }

    return null;
  }

  /**
   * Verifica se una data è prefestiva (venerdì o vigilia di festività)
   * @param {string} dateStr - Data in formato YYYY-MM-DD
   * @returns {boolean}
   */
  isPreHoliday(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // Venerdì
    if (dayOfWeek === 5) {
      return true;
    }

    // Verifica se domani è festività
    const tomorrow = new Date(date);
    tomorrow.setDate(date.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return this.isHoliday(tomorrowStr) !== null;
  }

  /**
   * Ottiene il tipo di giorno e suggerimento attività
   * @param {string} dateStr - Data in formato YYYY-MM-DD
   * @returns {Object} Info sul tipo di giorno
   */
  getDayInfo(dateStr) {
    const holiday = this.isHoliday(dateStr);
    if (holiday) {
      return {
        isSpecial: true,
        type: 'holiday',
        name: holiday.name,
        suggestedActivityType: 'festività',
        message: `Festività: ${holiday.name}`
      };
    }

    const weekend = this.isWeekend(dateStr);
    if (weekend) {
      return {
        isSpecial: true,
        type: 'weekend',
        name: weekend.name,
        suggestedActivityType: 'festività',
        message: weekend.name
      };
    }

    const isPreHoliday = this.isPreHoliday(dateStr);
    if (isPreHoliday) {
      return {
        isSpecial: true,
        type: 'preholiday',
        name: 'Prefestivo',
        suggestedActivityType: null,
        message: 'Giorno prefestivo'
      };
    }

    return {
      isSpecial: false,
      type: 'workday',
      name: 'Giorno lavorativo',
      suggestedActivityType: 'lavoro',
      message: null
    };
  }
}

module.exports = new HolidayService();
