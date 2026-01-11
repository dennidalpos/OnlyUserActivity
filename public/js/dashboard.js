'use strict';

let currentDate = '';
let editingActivityId = null;
let activityTypes = [];
let quickActions = [];
let requiredMinutes = 480;
let calendarDate = '';
let selectedCalendarDate = '';
let currentActivitiesDate = '';
let lastActionAnchor = null;

let token = '';

function initDashboard(config) {
  token = config.token;
  currentDate = config.currentDate;
  calendarDate = config.currentDate;
  selectedCalendarDate = config.currentDate;
  currentActivitiesDate = config.currentDate;

  console.log('Dashboard script loaded. Token:', token ? 'present' : 'missing');

  populateDurationSelects();
  loadActivityTypes();
  loadQuickActions();
  loadActivities();
  loadMonthCalendar();

  document.getElementById('activityType').addEventListener('change', updateCustomTypeVisibility);

  document.getElementById('btnLoadActivities')?.addEventListener('click', function() {
    loadActivities(this);
  });

  document.getElementById('btnSetToday')?.addEventListener('click', function() {
    setToday(this);
  });

  document.getElementById('btnShowAddActivity')?.addEventListener('click', function() {
    showAddActivity(this);
  });

  document.getElementById('btnCancelAdd')?.addEventListener('click', function() {
    cancelAdd(this);
  });

  document.getElementById('activityForm')?.addEventListener('submit', function(e) {
    addActivity(e);
  });

  document.getElementById('btnPrevMonth')?.addEventListener('click', function() {
    navigateMonth(-1, this);
  });

  document.getElementById('btnNextMonth')?.addEventListener('click', function() {
    navigateMonth(1, this);
  });
}

async function loadActivityTypes() {
  try {
    const response = await fetch('/api/activities/types', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    const result = await response.json();
    if (result.success) {
      activityTypes = result.data;
      populateActivityTypeSelect();
    }
  } catch (error) {
    console.error('Error loading activity types:', error);
    activityTypes = ['lavoro', 'meeting', 'formazione'];
    populateActivityTypeSelect();
  }
}

async function loadQuickActions() {
  try {
    const response = await fetch('/api/activities/quick-actions', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    const result = await response.json();
    if (result.success) {
      quickActions = result.data || [];
      renderQuickActions();
    }
  } catch (error) {
    console.error('Error loading quick actions:', error);
    quickActions = [];
    renderQuickActions();
  }
}

function renderQuickActions() {
  const calendarContainer = document.getElementById('calendarQuickActions');
  if (!calendarContainer) {
    return;
  }

  if (!quickActions.length) {
    calendarContainer.innerHTML = '<span class="text-muted text-small">Nessuna quick action disponibile.</span>';
    return;
  }

  calendarContainer.innerHTML = '';
  quickActions.forEach(function(action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.textContent = action.label;
    btn.addEventListener('click', function() {
      applyQuickDay(action.id, this);
    });
    calendarContainer.appendChild(btn);
  });
}

function populateActivityTypeSelect() {
  const select = document.getElementById('activityType');
  select.innerHTML = '';
  activityTypes.forEach(function(type) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    select.appendChild(option);
  });
  updateCustomTypeVisibility();
}

function updateCustomTypeVisibility() {
  const selected = document.getElementById('activityType').value;
  const group = document.getElementById('customTypeGroup');
  const customField = document.getElementById('customType');
  if (selected === 'altro') {
    group.style.display = 'block';
    customField.required = true;
  } else {
    group.style.display = 'none';
    customField.required = false;
    customField.value = '';
  }
}

function populateDurationSelects() {
  const hoursSelect = document.getElementById('durationHours');
  const minutesSelect = document.getElementById('durationMinutes');
  hoursSelect.innerHTML = '';
  minutesSelect.innerHTML = '';

  for (let i = 0; i <= 24; i += 1) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = i + 'h';
    hoursSelect.appendChild(option);
  }

  [0, 15, 30, 45].forEach(function(min) {
    const option = document.createElement('option');
    option.value = String(min);
    option.textContent = min + 'm';
    minutesSelect.appendChild(option);
  });

  hoursSelect.value = '0';
  minutesSelect.value = '0';
}

function setDurationSelectValues(durationMinutesValue) {
  const hoursSelect = document.getElementById('durationHours');
  const minutesSelect = document.getElementById('durationMinutes');
  const hours = Math.max(0, Math.floor(durationMinutesValue / 60));
  const minutes = durationMinutesValue % 60;

  hoursSelect.value = String(Math.min(hours, 24));
  minutesSelect.value = String([0, 15, 30, 45].includes(minutes) ? minutes : 0);
}

function setToday(anchor) {
  console.log('setToday called');
  lastActionAnchor = anchor || document.getElementById('activityDate');
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('activityDate').value = today;
  loadActivities();
}

function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      func.apply(context, args);
    }, wait);
  };
}

const debouncedLoadActivities = debounce(function() {
  loadActivities();
}, 300);

async function loadActivities(anchor) {
  lastActionAnchor = anchor || document.getElementById('activityDate');
  resetActivityFormState();
  console.log('loadActivities called for date:', document.getElementById('activityDate')?.value);
  const date = document.getElementById('activityDate').value;
  currentDate = date;
  selectedCalendarDate = date;
  const parts = date.split('-');
  const year = parts[0];
  const month = parts[1];
  const monthPrefix = year + '-' + month;
  if (!calendarDate.startsWith(monthPrefix)) {
    calendarDate = year + '-' + month + '-01';
    loadMonthCalendar();
  } else {
    highlightSelectedCalendarDay();
  }

  try {
    console.log('Fetching activities from API...');
    const response = await fetch('/api/activities/' + date, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    console.log('API response status:', response.status);
    const result = await response.json();
    console.log('API result:', result);

    if (result.success) {
      displayActivities(result.data);
    } else {
      showError(result.error.message);
    }
  } catch (error) {
    console.error('Error loading activities:', error);
    showError('Errore nel caricamento delle attività');
  }
}

function displayActivities(data) {
  const activities = data.activities || [];
  const summary = data.summary || {};

  const totalMinutes = Number.isFinite(summary.totalMinutes) ? summary.totalMinutes : 0;
  requiredMinutes = Number.isFinite(summary.requiredMinutes) ? summary.requiredMinutes : 480;

  document.getElementById('totalHours').textContent =
    Math.floor(totalMinutes / 60) + 'h ' + (totalMinutes % 60) + 'm';

  const overtimeMinutes = totalMinutes > requiredMinutes ? totalMinutes - requiredMinutes : 0;
  const overtimeHours = Math.floor(overtimeMinutes / 60);
  const overtimeMins = overtimeMinutes % 60;
  document.getElementById('overtime').textContent = overtimeMinutes > 0
    ? overtimeHours + 'h ' + overtimeMins + 'm'
    : '-';
  document.getElementById('overtime').style.color = overtimeMinutes > 0 ? '#28a745' : '#999';

  document.getElementById('activityCount').textContent = activities.length;
  const completionPercentage = requiredMinutes > 0
    ? Math.min(100, Math.round((totalMinutes / requiredMinutes) * 100))
    : 0;
  const progressBarFill = document.getElementById('progressBarFill');
  const progressText = document.getElementById('progressText');

  progressBarFill.style.width = completionPercentage + '%';
  progressText.textContent = completionPercentage + '%';

  if (completionPercentage === 0) {
    document.getElementById('dayStatus').textContent = 'Non inserito';
  } else if (completionPercentage === 100) {
    document.getElementById('dayStatus').textContent = 'OK';
  } else {
    document.getElementById('dayStatus').textContent = 'Incompleta';
  }

  if (completionPercentage < 50) {
    progressBarFill.style.backgroundColor = '#dc3545';
  } else if (completionPercentage < 100) {
    progressBarFill.style.backgroundColor = '#ffc107';
  } else {
    progressBarFill.style.backgroundColor = '#28a745';
  }

  const list = document.getElementById('activitiesList');

  if (activities.length === 0) {
    list.innerHTML = '<p class="no-data">Nessuna attività per questa data</p>';
    window.currentActivities = activities;
    currentActivitiesDate = currentDate;
    return;
  }

  list.innerHTML = '';
  activities.forEach(function(activity) {
    const hours = Math.floor(activity.durationMinutes / 60);
    const mins = activity.durationMinutes % 60;
    const durationText = hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
    const typeLabel = activity.customType
      ? activity.customType
      : activity.activityType;
    const activityTypeFormatted = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);

    const dateObj = new Date(currentDate + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const item = document.createElement('div');
    item.className = 'activity-item';
    item.setAttribute('data-activity-id', activity.id);

    const header = document.createElement('div');
    header.className = 'activity-header';

    const info = document.createElement('div');
    info.className = 'activity-info';

    const typeSpan = document.createElement('span');
    typeSpan.className = 'activity-type badge badge-' + activity.activityType;
    typeSpan.textContent = activityTypeFormatted;
    info.appendChild(typeSpan);

    const durationSpan = document.createElement('span');
    durationSpan.className = 'activity-duration';
    durationSpan.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="icon-inline icon-inline--spaced"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/><path d="M8 4.5a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3.5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5z"/></svg>Durata: ' + durationText;
    info.appendChild(durationSpan);

    const dateSpan = document.createElement('span');
    dateSpan.className = 'activity-date';
    dateSpan.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="icon-inline icon-inline--spaced"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>' + dateFormatted;
    info.appendChild(dateSpan);

    header.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'activity-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-primary';
    editBtn.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="icon-inline"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>Modifica';
    editBtn.addEventListener('click', function() {
      editActivity(activity.id, this);
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="icon-inline"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>Elimina';
    deleteBtn.addEventListener('click', function() {
      deleteActivity(activity.id, this);
    });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    item.appendChild(header);

    if (activity.notes) {
      const notes = document.createElement('div');
      notes.className = 'activity-notes';
      notes.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="icon-inline icon-inline--spaced"><path d="M5 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H5zm0 1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/></svg>' + escapeHtml(activity.notes);
      item.appendChild(notes);
    }

    list.appendChild(item);
  });

  window.currentActivities = activities;
  currentActivitiesDate = currentDate;
  if (window.uiHelper) {
    window.uiHelper.bindHelpTargets(list);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showAddActivity(anchor) {
  console.log('showAddActivity called');
  lastActionAnchor = anchor || document.getElementById('addActivityForm');
  editingActivityId = null;
  document.getElementById('addActivityForm').style.display = 'block';
  setDurationSelectValues(0);
  document.getElementById('activityType').value = activityTypes[0] || 'lavoro';
  updateCustomTypeVisibility();
  document.getElementById('customType').value = '';
  document.getElementById('notes').value = '';

  document.querySelector('#addActivityForm h4').textContent = 'Aggiungi Attività';
  document.querySelector('#addActivityForm button[type="submit"]').textContent = 'Salva';
}

function editActivity(activityId, anchor) {
  console.log('editActivity called for:', activityId);
  lastActionAnchor = anchor || document.getElementById('addActivityForm');

  const activity = window.currentActivities?.find(function(a) { return a.id === activityId; });
  if (!activity) {
    showError('Attività non trovata');
    return;
  }

  editingActivityId = activityId;
  document.getElementById('addActivityForm').style.display = 'block';
  setDurationSelectValues(activity.durationMinutes);
  document.getElementById('activityType').value = activity.activityType;
  updateCustomTypeVisibility();
  document.getElementById('customType').value = activity.customType || '';
  document.getElementById('notes').value = activity.notes || '';

  document.querySelector('#addActivityForm h4').textContent = 'Modifica Attività';
  document.querySelector('#addActivityForm button[type="submit"]').textContent = 'Aggiorna';

  document.getElementById('addActivityForm').scrollIntoView({ behavior: 'smooth' });
}

function cancelAdd(anchor) {
  console.log('cancelAdd called');
  lastActionAnchor = anchor || document.getElementById('addActivityForm');
  resetActivityFormState();
}

function resetActivityFormState() {
  document.getElementById('addActivityForm').style.display = 'none';
  editingActivityId = null;
  document.querySelector('#addActivityForm h4').textContent = 'Aggiungi Attività';
  document.querySelector('#addActivityForm button[type="submit"]').textContent = 'Salva';
  document.getElementById('customType').value = '';
}

async function addActivity(event) {
  console.log('addActivity called', editingActivityId ? '(UPDATE mode)' : '(CREATE mode)');
  event.preventDefault();
  lastActionAnchor = event.submitter || document.querySelector('#addActivityForm button[type="submit"]');

  if (editingActivityId && !window.currentActivities?.some(function(activity) { return activity.id === editingActivityId; })) {
    showError('Attività non trovata');
    resetActivityFormState();
    return;
  }

  const selectedType = document.getElementById('activityType').value;
  const data = {
    durationHours: Number(document.getElementById('durationHours').value),
    durationMinutes: Number(document.getElementById('durationMinutes').value),
    activityType: selectedType,
    customType: document.getElementById('customType').value.trim(),
    notes: document.getElementById('notes').value
  };

  const totalMinutes = (data.durationHours * 60) + data.durationMinutes;
  if (totalMinutes === 0) {
    showError('La durata deve essere maggiore di 0');
    return;
  }

  if (selectedType !== 'altro') {
    data.customType = '';
  }

  if (!editingActivityId) {
    data.date = currentDate;
  }

  console.log(editingActivityId ? 'Updating' : 'Creating', 'activity with data:', data);

  try {
    let url, method;

    if (editingActivityId) {
      url = '/api/activities/' + editingActivityId + '?date=' + currentDate;
      method = 'PUT';
    } else {
      url = '/api/activities';
      method = 'POST';
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Result:', result);

    if (result.success) {
      cancelAdd();
      loadActivities();
      loadMonthCalendar();
      showSuccess(editingActivityId ? 'Attività aggiornata con successo' : 'Attività aggiunta con successo');
    } else {
      showError(result.error?.message || result.error || 'Errore sconosciuto');
    }
  } catch (error) {
    console.error('Error saving activity:', error);
    showError("Errore nel salvataggio dell'attività");
  }
}

async function deleteActivity(activityId, anchor) {
  lastActionAnchor = anchor || document.querySelector('[data-activity-id="' + activityId + '"]');
  if (!confirm('Sei sicuro di voler eliminare questa attività?')) {
    return;
  }

  try {
    const response = await fetch('/api/activities/' + activityId + '?date=' + currentDate, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const result = await response.json();

    if (result.success) {
      loadActivities();
      loadMonthCalendar();
    } else {
      showError(result.error.message);
    }
  } catch (error) {
    showError("Errore nell'eliminazione");
  }
}

function showError(message) {
  console.error('showError:', message);
  if (window.uiHelper && window.uiHelper.enabled) {
    window.uiHelper.notify({
      anchor: lastActionAnchor || document.getElementById('activitiesList'),
      message: message,
      severity: 'error'
    });
    return;
  }
  alert('Errore: ' + message);
}

function showSuccess(message) {
  console.log('showSuccess:', message);
  if (window.uiHelper && window.uiHelper.enabled) {
    window.uiHelper.notify({
      anchor: lastActionAnchor || document.getElementById('activitiesList'),
      message: message,
      severity: 'info'
    });
    return;
  }
  alert(message);
}

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
