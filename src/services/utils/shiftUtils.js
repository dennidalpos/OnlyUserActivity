const FIXED_HOLIDAYS = new Set([
  '01-01',
  '01-06',
  '04-25',
  '05-01',
  '06-02',
  '08-15',
  '11-01',
  '12-08',
  '12-25',
  '12-26'
]);

function isWeekend(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateString) {
  const [, month, day] = dateString.split('-');
  return FIXED_HOLIDAYS.has(`${month}-${day}`);
}

function isWorkingDay(dateString, shiftType) {
  if (!shiftType) {
    return true;
  }

  if (shiftType.includeWeekends === false && isWeekend(dateString)) {
    return false;
  }

  if (shiftType.includeHolidays === false && isHoliday(dateString)) {
    return false;
  }

  return true;
}

function findShiftType(shiftTypes, shiftName) {
  if (!shiftName) {
    return null;
  }
  return shiftTypes.find(type => type.name === shiftName || type.id === shiftName) || null;
}

module.exports = {
  isWeekend,
  isHoliday,
  isWorkingDay,
  findShiftType
};
