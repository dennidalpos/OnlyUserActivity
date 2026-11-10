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
