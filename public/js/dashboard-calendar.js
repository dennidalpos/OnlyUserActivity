function formatMonthLabel(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function selectCalendarDate(dateString) {
  selectedCalendarDate = dateString;
  document.getElementById('activityDate').value = dateString;
  currentDate = dateString;
  loadActivities();

  const parts = dateString.split('-');
  const year = parts[0];
  const month = parts[1];
  const currentMonthPrefix = year + '-' + month;
  if (!calendarDate.startsWith(currentMonthPrefix)) {
    calendarDate = year + '-' + month + '-01';
    loadMonthCalendar();
  } else {
    highlightSelectedCalendarDay();
  }
}

function highlightSelectedCalendarDay() {
  document.querySelectorAll('.calendar-day').forEach(function(cell) {
    const dateValue = cell.getAttribute('data-date');
    if (dateValue === selectedCalendarDate) {
      cell.classList.add('selected');
    } else {
      cell.classList.remove('selected');
    }
  });
}

function formatDurationMinutes(totalMinutes) {
  const minutesValue = Number(totalMinutes);
  if (!Number.isFinite(minutesValue) || minutesValue <= 0) {
    return '-';
  }
  const hours = Math.floor(minutesValue / 60);
  const minutes = minutesValue % 60;
  if (hours > 0 && minutes > 0) {
    return hours + 'h ' + minutes + 'm';
  }
  if (hours > 0) {
    return hours + 'h';
  }
  return minutes + 'm';
}

function renderCalendar(days, year, month) {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  dayNames.forEach(function(name) {
    const header = document.createElement('div');
    header.className = 'calendar-day calendar-day-header';
    header.textContent = name;
    grid.appendChild(header);
  });

  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < startOffset; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day calendar-day-empty';
    grid.appendChild(empty);
  }

  days.forEach(function(day) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day';
    const dateObj = new Date(day.date + 'T00:00:00');
    const activities = Array.isArray(day.activities) ? day.activities : [];
    const maxVisible = 3;
    const visibleActivities = activities.slice(0, maxVisible);
    const extraCount = activities.length - visibleActivities.length;

    const numberSpan = document.createElement('span');
    numberSpan.className = 'calendar-day-number';
    numberSpan.textContent = dateObj.getDate();
    cell.appendChild(numberSpan);

    const ul = document.createElement('ul');
    ul.className = 'calendar-day-activities';

    visibleActivities.forEach(function(activity) {
      const typeLabel = activity.customType ? activity.customType : activity.activityType;
      const durationText = formatDurationMinutes(activity.durationMinutes);
      const li = document.createElement('li');
      li.className = 'calendar-day-activity';

      const typeSpan = document.createElement('span');
      typeSpan.className = 'calendar-day-activity-type';
      typeSpan.textContent = typeLabel;
      li.appendChild(typeSpan);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'calendar-day-activity-time';
      timeSpan.textContent = durationText;
      li.appendChild(timeSpan);

      ul.appendChild(li);
    });

    if (extraCount > 0) {
      const moreLi = document.createElement('li');
      moreLi.className = 'calendar-day-activity calendar-day-activity-more';
      moreLi.textContent = '+' + extraCount + ' altre';
      ul.appendChild(moreLi);
    }

    cell.appendChild(ul);
    cell.setAttribute('data-date', day.date);

    if (!day.isRequired) {
      cell.classList.add('day-off');
    } else if (day.status === 'OK') {
      cell.classList.add('day-ok');
    } else if (day.status === 'Incompleto') {
      cell.classList.add('day-incomplete');
    } else {
      cell.classList.add('day-missing');
    }

    if (day.isFuture) {
      cell.classList.add('day-future');
    }

    if (day.date === selectedCalendarDate) {
      cell.classList.add('selected');
    }

    cell.addEventListener('click', function() {
      selectCalendarDate(day.date);
    });
    grid.appendChild(cell);
  });
}

function renderIrregularities(irregularities) {
  const container = document.getElementById('irregularityShortcuts');
  if (!irregularities || irregularities.length === 0) {
    container.innerHTML = '<p class="no-data">Nessuna irregolarità trovata.</p>';
    return;
  }

  container.innerHTML = '';
  irregularities.forEach(function(item) {
    let statusClass = 'missing';
    if (item.status === 'OK') statusClass = 'ok';
    else if (item.status === 'Incompleto') statusClass = 'incomplete';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm irregularity-btn irregularity-btn--' + statusClass;
    btn.textContent = item.date + ' · ' + item.status;
    btn.addEventListener('click', function() {
      selectCalendarDate(item.date);
    });
    container.appendChild(btn);
  });
}

async function loadMonthCalendar(anchor) {
  lastActionAnchor = anchor || document.getElementById('calendarGrid');
  try {
    const response = await fetch('/api/activities/month?date=' + calendarDate, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const result = await response.json();
    if (!result.success) {
      showError(result.error?.message || 'Errore nel caricamento del calendario');
      return;
    }

    const monthData = result.data.month;
    const days = result.data.days;
    const irregularities = result.data.irregularities;
    const monthLabel = formatMonthLabel(monthData.year + '-' + String(monthData.month).padStart(2, '0') + '-01');
    document.getElementById('calendarMonthLabel').textContent = monthLabel;
    renderCalendar(days, monthData.year, monthData.month);
    renderIrregularities(irregularities);
  } catch (error) {
    console.error('Error loading month calendar:', error);
    showError('Errore nel caricamento del calendario');
  }
}

function navigateMonth(direction, anchor) {
  lastActionAnchor = anchor || document.getElementById('calendarGrid');
  const baseDate = new Date(calendarDate + 'T00:00:00');
  baseDate.setMonth(baseDate.getMonth() + direction);
  calendarDate = baseDate.toISOString().split('T')[0];
  loadMonthCalendar();
}

function getQuickDayDurationParts() {
  const minutes = Number.isFinite(requiredMinutes) ? requiredMinutes : 480;
  const roundedMinutes = Math.min(24 * 60, Math.ceil(minutes / 15) * 15);
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  return { hours: hours, minutes: remainder };
}

function resolveQuickAction(id) {
  return quickActions.find(function(action) { return action.id === id; });
}

async function ensureSelectedDateActivitiesLoaded() {
  if (currentActivitiesDate === selectedCalendarDate) {
    return;
  }
  document.getElementById('activityDate').value = selectedCalendarDate;
  currentDate = selectedCalendarDate;
  await loadActivities();
}

async function applyQuickDay(actionId, anchor) {
  lastActionAnchor = anchor || document.querySelector('.quick-actions');
  if (!selectedCalendarDate) {
    showError('Seleziona prima un giorno dal calendario');
    return;
  }

  await ensureSelectedDateActivitiesLoaded();

  if (window.currentActivities && window.currentActivities.length > 0 && currentActivitiesDate === selectedCalendarDate) {
    showError('Esistono già attività per questa data. Rimuovile prima di applicare una quick action.');
    return;
  }

  const action = resolveQuickAction(actionId);
  if (!action) {
    showError('Quick action non trovata');
    return;
  }

  const duration = getQuickDayDurationParts();
  const payload = {
    date: selectedCalendarDate,
    activityType: action.activityType,
    customType: action.label,
    durationHours: duration.hours,
    durationMinutes: duration.minutes,
    notes: action.notes || ''
  };

  if (action.activityType !== 'altro') {
    payload.customType = action.label;
  }

  try {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      loadActivities();
      loadMonthCalendar();
      showSuccess('Giornata impostata: ' + action.label);
    } else {
      showError(result.error?.message || 'Errore nel salvataggio');
    }
  } catch (error) {
    console.error('Quick day error:', error);
    showError('Errore nel salvataggio della giornata');
  }
}

window.initDashboard = initDashboard;
window.setToday = setToday;
window.loadActivities = loadActivities;
window.debouncedLoadActivities = debouncedLoadActivities;
window.showAddActivity = showAddActivity;
window.editActivity = editActivity;
window.cancelAdd = cancelAdd;
window.addActivity = addActivity;
window.deleteActivity = deleteActivity;
window.navigateMonth = navigateMonth;
window.applyQuickDay = applyQuickDay;
window.selectCalendarDate = selectCalendarDate;
