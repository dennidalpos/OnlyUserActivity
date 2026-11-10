class TimePicker {
  constructor() {
    this.hours = [];
    this.minutes = ['00', '15', '30', '45'];

    for (let h = 0; h < 24; h++) {
      this.hours.push(h.toString().padStart(2, '0'));
    }
  }

  createTimePicker(elementId, defaultValue = '09:00') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const [defaultHour, defaultMinute] = defaultValue.split(':');

    const container = document.createElement('div');
    container.className = 'time-picker-container';
    container.style.cssText = 'display: flex; gap: 4px; align-items: center;';

    const hourSelect = document.createElement('select');
    hourSelect.className = 'time-picker-hour';
    hourSelect.style.cssText = 'flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;';

    this.hours.forEach(hour => {
      const option = document.createElement('option');
      option.value = hour;
      option.textContent = hour;
      if (hour === defaultHour) option.selected = true;
      hourSelect.appendChild(option);
    });

    const separator = document.createElement('span');
    separator.textContent = ':';
    separator.style.cssText = 'font-weight: bold; font-size: 18px;';

    const minuteSelect = document.createElement('select');
    minuteSelect.className = 'time-picker-minute';
    minuteSelect.style.cssText = 'flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;';

    this.minutes.forEach(minute => {
      const option = document.createElement('option');
      option.value = minute;
      option.textContent = minute;
      if (minute === defaultMinute) option.selected = true;
      minuteSelect.appendChild(option);
    });

    const updateValue = () => {
      const timeValue = `${hourSelect.value}:${minuteSelect.value}`;
      element.value = timeValue;
      element.dispatchEvent(new Event('change'));
    };

    hourSelect.addEventListener('change', updateValue);
    minuteSelect.addEventListener('change', updateValue);

    container.appendChild(hourSelect);
    container.appendChild(separator);
    container.appendChild(minuteSelect);

    element.type = 'hidden';
    element.parentNode.insertBefore(container, element.nextSibling);

    updateValue();

    return {
      getValue: () => element.value,
      setValue: (value) => {
        const [h, m] = value.split(':');
        hourSelect.value = h;
        minuteSelect.value = m;
        updateValue();
      },
      getHourSelect: () => hourSelect,
      getMinuteSelect: () => minuteSelect
    };
  }

  createAllTimePickers() {
    const timeInputs = document.querySelectorAll('input[type="time"]');
    const pickers = [];

    timeInputs.forEach(input => {
      if (input.dataset.timepickerInitialized) return;

      input.dataset.timepickerInitialized = 'true';
      const defaultValue = input.value || '09:00';
      const picker = this.createTimePicker(input.id, defaultValue);
      pickers.push(picker);
    });

    return pickers;
  }
}

const timePicker = new TimePicker();
