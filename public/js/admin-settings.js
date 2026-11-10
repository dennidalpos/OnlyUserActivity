(function initAdminSettingsPage() {
  let ldapBindTestFingerprint = null;
  let lastActionAnchor = null;

  function setLastActionAnchor(anchor) {
    if (anchor) {
      lastActionAnchor = anchor;
    }
  }

  function showAlert(message, type = 'success') {
    if (window.uiHelper && window.uiHelper.enabled) {
      const severityMap = { success: 'info', info: 'info', danger: 'error' };
      window.uiHelper.notify({
        anchor: lastActionAnchor || document.getElementById('alertContainer'),
        message,
        severity: severityMap[type] || 'info'
      });
      return;
    }

    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  }

  function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((item) => item.value);
  }

  function requestRestart(anchor, message) {
    if (window.confirm(message)) {
      restartServer(anchor);
    }
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  async function handleSubmit(url, payload, options = {}) {
    try {
      const result = await postJson(url, payload);
      if (!result.success) {
        showAlert(result.error || options.fallbackError || 'Operazione non riuscita', 'danger');
        return result;
      }

      showAlert(result.data?.message || result.message || options.successMessage || 'Operazione completata', 'success');
      if (options.reloadOnSuccess) {
        window.location.reload();
      }
      if (options.restartPrompt) {
        requestRestart(lastActionAnchor, options.restartPrompt);
      }

      return result;
    } catch (error) {
      showAlert(options.fallbackError || 'Errore imprevisto', 'danger');
      return null;
    }
  }

  async function detectConfigSections(fileInput) {
    if (!fileInput?.files?.length) {
      return;
    }

    setLastActionAnchor(fileInput);

    try {
      const text = await fileInput.files[0].text();
      const data = JSON.parse(text);
      const settings = data.settings || {};
      const detectedSections = new Set();

      document.querySelectorAll('input[name="fullConfigSection"]').forEach((checkbox) => {
        checkbox.checked = false;
      });

      if (settings.server && Object.keys(settings.server).length > 0) detectedSections.add('settings');
      if (settings.logging && Object.keys(settings.logging).length > 0) detectedSections.add('logging');
      if (settings.ldap && Object.keys(settings.ldap).length > 0) detectedSections.add('ldap');
      if (settings.https && Object.keys(settings.https).length > 0) detectedSections.add('https');
      if (settings.jwt || settings.storage || settings.admin || settings.security || settings.activity) detectedSections.add('advanced');
      if (Array.isArray(data.activityTypes) && data.activityTypes.length > 0) detectedSections.add('activityTypes');
      if (Array.isArray(data.shiftTypes) && data.shiftTypes.length > 0) detectedSections.add('shiftTypes');
      if (Array.isArray(data.contractPresets) && data.contractPresets.length > 0) detectedSections.add('contractPresets');
      if (Array.isArray(data.quickActions) && data.quickActions.length > 0) detectedSections.add('quickActions');
      if (Array.isArray(data.users) && data.users.length > 0) detectedSections.add('users');
      if (Array.isArray(data.activities) && data.activities.length > 0) detectedSections.add('activities');

      const detectedList = Array.from(detectedSections);
      detectedList.forEach((section) => {
        const checkbox = document.querySelector(`input[name="fullConfigSection"][value="${section}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });

      showAlert(
        detectedList.length > 0
          ? `Rilevate ${detectedList.length} sezioni: ${detectedList.join(', ')}`
          : 'Nessuna sezione riconosciuta nel file JSON',
        detectedList.length > 0 ? 'info' : 'danger'
      );
    } catch (error) {
      showAlert('File JSON non valido. Verifica il formato.', 'danger');
    }
  }

  async function exportConfiguration(anchor) {
    setLastActionAnchor(anchor);
    const sections = getCheckedValues('fullConfigSection');
    if (sections.length === 0) {
      showAlert('Seleziona almeno una sezione da esportare', 'danger');
      return;
    }

    const link = document.createElement('a');
    link.href = `/admin/api/settings/configuration/export?${new URLSearchParams({ sections: sections.join(',') }).toString()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('Export avviato', 'success');
  }

  async function importConfiguration(anchor) {
    setLastActionAnchor(anchor);
    const fileInput = document.getElementById('configImportFile');
    const sections = getCheckedValues('fullConfigSection');

    if (!fileInput?.files?.length) {
      showAlert('Seleziona un file JSON da importare', 'danger');
      return;
    }
    if (sections.length === 0) {
      showAlert('Seleziona almeno una sezione da importare', 'danger');
      return;
    }
    if (!window.confirm('L\'importazione sovrascriverà utenti, attività e impostazioni. Continuare?')) {
      return;
    }

    try {
      const payload = JSON.parse(await fileInput.files[0].text());
      const result = await postJson('/admin/api/settings/configuration/import', { payload, sections });
      if (result.success) {
        showAlert(result.data.message || 'Import completato', 'success');
        requestRestart(lastActionAnchor, 'Import completato. È consigliato riavviare il server per applicare le impostazioni. Vuoi riavviare ora?');
      } else {
        showAlert(result.error || 'Errore durante l\'import', 'danger');
      }
    } catch (error) {
      showAlert('File JSON non valido o errore durante l\'import', 'danger');
    }
  }

  async function testLdapBind(anchor) {
    setLastActionAnchor(anchor);
    const payload = {
      url: document.getElementById('ldapUrl').value,
      bindDN: document.getElementById('ldapBindDN').value,
      bindPassword: document.getElementById('ldapBindPassword').value,
      timeout: document.getElementById('ldapTimeout').value
    };

    try {
      const result = await postJson('/admin/api/settings/ldap/test-bind', payload);
      if (result.success) {
        ldapBindTestFingerprint = JSON.stringify(payload);
        showAlert(result.data.message || 'Test LDAP riuscito', 'success');
      } else {
        showAlert(result.error, 'danger');
      }
    } catch (error) {
      showAlert('Errore durante il test bind LDAP', 'danger');
    }
  }

  async function removeActivityType(type, anchor) {
    setLastActionAnchor(anchor);
    if (!window.confirm(`Sei sicuro di voler rimuovere la categoria "${type}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/admin/api/settings/activity-types/${encodeURIComponent(type)}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        showAlert('Categoria rimossa con successo', 'success');
        window.location.reload();
      } else {
        showAlert(result.error, 'danger');
      }
    } catch (error) {
      showAlert('Errore nella rimozione della categoria', 'danger');
    }
  }

  function browseHttpsFile(targetId, anchor) {
    setLastActionAnchor(anchor);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        document.getElementById(targetId).value = fileInput.files[0].name;
        showAlert('File selezionato. Inserisci il percorso assoluto sul server Windows se diverso.', 'info');
      }
    });
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async function runTroubleshoot(type, payload, errorMessage, anchor) {
    setLastActionAnchor(anchor);
    try {
      const result = await postJson('/admin/api/settings/troubleshoot', { type, payload });
      showAlert(result.success ? result.data.message : result.error, result.success ? 'success' : 'danger');
    } catch (error) {
      showAlert(errorMessage, 'danger');
    }
  }

  async function resetAdminPassword(anchor) {
    setLastActionAnchor(anchor);
    const newPassword = window.prompt('Inserisci la nuova password admin:');
    if (!newPassword) {
      return;
    }

    const result = await handleSubmit('/admin/api/admin/reset-password', { newPassword }, {
      fallbackError: 'Errore nel reset della password admin'
    });

    if (result?.success && result.requiresLogin) {
      setTimeout(() => {
        window.location.href = '/admin/auth/login';
      }, 1000);
    }
  }

  async function loadServerInfo(anchor) {
    setLastActionAnchor(anchor);
    const container = document.getElementById('serverInfoContainer');
    container.innerHTML = '<div class="text-muted">Caricamento informazioni...</div>';

    try {
      const response = await fetch('/admin/api/server/info');
      const result = await response.json();
      if (!result.success) {
        container.innerHTML = '';
        showAlert(result.error || 'Errore nel caricamento delle informazioni server', 'danger');
        return;
      }

      const info = result.data || {};
      const items = [
        ['Hostname', info.hostname],
        ['Ambiente', info.env],
        ['Versione Node', info.nodeVersion],
        ['Piattaforma', info.platform],
        ['PID', info.pid],
        ['Uptime', info.uptime],
        ['Memoria', info.memoryUsage],
        ['Avvio server', info.startTime]
      ];

      container.innerHTML = items.map(([label, value]) => `
        <div class="server-info-card">
          <div class="server-info-label">${label}</div>
          <div class="server-info-value">${value || '-'}</div>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = '';
      showAlert('Errore nel caricamento delle informazioni server', 'danger');
    }
  }

  async function restartServer(anchor) {
    setLastActionAnchor(anchor);
    try {
      const response = await fetch('/admin/api/server/restart', { method: 'POST' });
      const result = await response.json();
      showAlert(result.success ? 'Server in riavvio... Ricarica la pagina tra 5 secondi.' : result.error, result.success ? 'success' : 'danger');
    } catch (error) {
      showAlert('Server in riavvio... Ricarica la pagina tra 5 secondi.', 'info');
    }

    setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  function bindForm(id, buildPayload, options = {}) {
    document.getElementById(id)?.addEventListener('submit', async (event) => {
      event.preventDefault();
      setLastActionAnchor(event.submitter || document.querySelector(`#${id} button[type="submit"]`));

      const payload = buildPayload();
      if (options.beforeSubmit && options.beforeSubmit(payload) === false) {
        return;
      }

      await handleSubmit(options.url, payload, options);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.helpSystem && window.adminSettingsHelp) {
      window.helpSystem.init(window.adminSettingsHelp);
    }

    bindForm('serverForm', () => ({
      port: document.getElementById('serverPort').value,
      host: document.getElementById('serverHost').value,
      trustProxy: document.getElementById('serverTrustProxy').value,
      defaultUserShift: document.getElementById('defaultUserShift').value
    }), {
      url: '/admin/api/settings/server',
      fallbackError: 'Errore nel salvataggio della configurazione server',
      restartPrompt: 'Le impostazioni sono state salvate. È necessario riavviare il server per applicare le modifiche. Vuoi riavviare ora?'
    });

    bindForm('ldapForm', () => ({
      enabled: document.getElementById('ldapEnabled').checked,
      url: document.getElementById('ldapUrl').value,
      baseDN: document.getElementById('ldapBaseDN').value,
      bindDN: document.getElementById('ldapBindDN').value,
      bindPassword: document.getElementById('ldapBindPassword').value,
      userSearchFilter: document.getElementById('ldapUserSearchFilter').value,
      groupSearchBase: document.getElementById('ldapGroupSearchBase').value,
      requiredGroup: document.getElementById('ldapRequiredGroup').value,
      timeout: document.getElementById('ldapTimeout').value
    }), {
      url: '/admin/api/settings/ldap',
      fallbackError: 'Errore nel salvataggio della configurazione LDAP',
      restartPrompt: 'Le impostazioni sono state salvate. È necessario riavviare il server per applicare le modifiche. Vuoi riavviare ora?',
      beforeSubmit: (payload) => {
        if (payload.enabled && payload.bindDN) {
          const currentFingerprint = JSON.stringify({
            url: payload.url,
            bindDN: payload.bindDN,
            bindPassword: payload.bindPassword,
            timeout: payload.timeout
          });

          if (ldapBindTestFingerprint !== currentFingerprint) {
            showAlert('Esegui il test bind LDAP con le credenziali correnti prima di salvare.', 'danger');
            return false;
          }
        }

        return true;
      }
    });

    bindForm('httpsForm', () => ({
      enabled: document.getElementById('httpsEnabled').checked,
      certPath: document.getElementById('httpsCertPath').value,
      keyPath: document.getElementById('httpsKeyPath').value
    }), {
      url: '/admin/api/settings/https',
      fallbackError: 'Errore nel salvataggio della configurazione HTTPS',
      restartPrompt: 'Le impostazioni sono state salvate. È necessario riavviare il server per applicare le modifiche. Vuoi riavviare ora?'
    });

    bindForm('addActivityTypeForm', () => ({
      activityType: document.getElementById('newActivityType').value.trim()
    }), {
      url: '/admin/api/settings/activity-types/add',
      fallbackError: 'Errore nell\'aggiunta della categoria',
      reloadOnSuccess: true,
      beforeSubmit: (payload) => Boolean(payload.activityType)
    });

    bindForm('advancedSettingsForm', () => ({
      jwt: {
        secret: document.getElementById('advancedJwtSecret').value,
        expiresIn: document.getElementById('advancedJwtExpiresIn').value,
        refreshEnabled: document.getElementById('advancedJwtRefreshEnabled').checked
      },
      storage: {
        rootPath: document.getElementById('advancedStorageRootPath').value,
        auditRetentionDays: document.getElementById('advancedAuditRetentionDays').value,
        auditPayloadMode: document.getElementById('advancedAuditPayloadMode').value
      },
      admin: {
        sessionSecret: document.getElementById('advancedAdminSessionSecret').value,
        sessionMaxAge: document.getElementById('advancedAdminSessionMaxAge').value,
        defaultUsername: document.getElementById('advancedAdminDefaultUsername').value,
        defaultPassword: document.getElementById('advancedAdminDefaultPassword').value
      },
      security: {
        rateLimitWindowMs: document.getElementById('advancedRateLimitWindowMs').value,
        rateLimitMaxRequests: document.getElementById('advancedRateLimitMaxRequests').value,
        loginRateLimitMax: document.getElementById('advancedLoginRateLimitMax').value,
        loginLockoutDurationMs: document.getElementById('advancedLoginLockoutDurationMs').value,
        corsOrigin: document.getElementById('advancedCorsOrigin').value
      },
      activity: {
        strictContinuity: document.getElementById('advancedActivityStrictContinuity').checked,
        requiredMinutes: document.getElementById('advancedActivityRequiredMinutes').value
      }
    }), {
      url: '/admin/api/settings/advanced',
      fallbackError: 'Errore nel salvataggio delle impostazioni avanzate',
      restartPrompt: 'Le impostazioni avanzate sono state salvate. È necessario riavviare il server per applicare le modifiche. Vuoi riavviare ora?'
    });

    bindForm('loggingForm', () => ({
      logging: {
        categories: {
          ldap: document.getElementById('logLdap').checked,
          http: document.getElementById('logHttp').checked,
          server: document.getElementById('logServer').checked,
          settings: document.getElementById('logSettings').checked,
          errors: document.getElementById('logErrors').checked,
          audit: document.getElementById('logAudit').checked
        }
      }
    }), {
      url: '/admin/api/settings/advanced',
      fallbackError: 'Errore nel salvataggio delle impostazioni di logging',
      restartPrompt: 'Le impostazioni di logging sono state salvate. È necessario riavviare il server per applicare le modifiche. Vuoi riavviare ora?'
    });

    loadServerInfo();

    document.getElementById('btnRestartServer')?.addEventListener('click', function onRestartClick() {
      setLastActionAnchor(this);
      requestRestart(this, 'Sei sicuro di voler riavviare il server? Tutti gli utenti verranno disconnessi temporaneamente.');
    });
    document.getElementById('btnExportConfig')?.addEventListener('click', function onExportClick() { exportConfiguration(this); });
    document.getElementById('btnImportConfig')?.addEventListener('click', function onImportClick() { importConfiguration(this); });
    document.getElementById('configImportFile')?.addEventListener('change', function onImportFileChange() { detectConfigSections(this); });
    document.getElementById('btnLoadServerInfo')?.addEventListener('click', function onLoadInfoClick() { loadServerInfo(this); });
    document.getElementById('btnTestLdapBind')?.addEventListener('click', function onLdapTestClick() { testLdapBind(this); });
    document.getElementById('btnStorageTest')?.addEventListener('click', function onStorageClick() {
      runTroubleshoot('storage', { rootPath: document.getElementById('advancedStorageRootPath')?.value }, 'Errore durante il test storage', this);
    });
    document.getElementById('btnHttpsTest')?.addEventListener('click', function onHttpsClick() {
      runTroubleshoot('https', {
        certPath: document.getElementById('httpsCertPath')?.value,
        keyPath: document.getElementById('httpsKeyPath')?.value
      }, 'Errore durante il test HTTPS', this);
    });
    document.getElementById('btnResetAdminPassword')?.addEventListener('click', function onResetPasswordClick() { resetAdminPassword(this); });
    document.querySelectorAll('[data-browse-target]').forEach((button) => {
      button.addEventListener('click', function onBrowseClick() { browseHttpsFile(this.dataset.browseTarget, this); });
    });
    document.querySelectorAll('[data-remove-type]').forEach((button) => {
      button.addEventListener('click', function onRemoveTypeClick() { removeActivityType(this.dataset.removeType, this); });
    });
  });
})();
