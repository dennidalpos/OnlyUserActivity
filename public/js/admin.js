// Admin dashboard JavaScript
(function() {
  'use strict';

  // Auto-submit form on date change
  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.addEventListener('change', function() {
      this.form.submit();
    });
  }

  // Export form handling
  const exportForm = document.getElementById('exportForm');
  if (exportForm) {
    exportForm.addEventListener('submit', function(e) {
      const fromDate = document.getElementById('fromDate').value;
      const toDate = document.getElementById('toDate').value;

      if (new Date(fromDate) > new Date(toDate)) {
        e.preventDefault();
        alert('La data di inizio deve essere precedente alla data di fine');
        return false;
      }
    });
  }

  // Initialize date inputs with today
  const today = new Date().toISOString().split('T')[0];
  const fromDateInput = document.getElementById('fromDate');
  const toDateInput = document.getElementById('toDate');

  if (fromDateInput && !fromDateInput.value) {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    fromDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
  }

  if (toDateInput && !toDateInput.value) {
    toDateInput.value = today;
  }

})();
