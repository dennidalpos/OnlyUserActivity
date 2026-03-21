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
