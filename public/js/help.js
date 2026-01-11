class HelpSystem {
  constructor() {
    this.modalHTML = `
      <div id="helpModal" class="help-modal" style="display: none;">
        <div class="help-modal-overlay" onclick="helpSystem.closeHelp()"></div>
        <div class="help-modal-content">
          <div class="help-modal-header">
            <h2>Guida all'utilizzo</h2>
            <button class="help-modal-close" onclick="helpSystem.closeHelp()">&times;</button>
          </div>
          <div class="help-modal-body" id="helpModalBody"></div>
        </div>
      </div>
    `;
  }

  init(helpContent) {
    document.body.insertAdjacentHTML('beforeend', this.modalHTML);

    const helpBtn = document.createElement('button');
    helpBtn.className = 'help-btn';
    helpBtn.innerHTML = '?';
    helpBtn.title = 'Aiuto';
    helpBtn.onclick = () => this.showHelp(helpContent);
    document.body.appendChild(helpBtn);
  }

  showHelp(content) {
    const modal = document.getElementById('helpModal');
    const body = document.getElementById('helpModalBody');
    body.innerHTML = content;
    modal.style.display = 'block';
  }

  closeHelp() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'none';
  }
}

const helpSystem = new HelpSystem();

const userDashboardHelp = `
  <div class="help-section">
    <h3>Dashboard Utente - Gestione Attivita</h3>
    <p>Benvenuto nella tua dashboard personale per il tracciamento delle attivita lavorative giornaliere.</p>
  </div>

  <div class="help-section">
    <h4>Inserimento Attivita</h4>
    <ol>
      <li>Clicca su "+ Nuova Attivita"</li>
      <li>Seleziona la durata (ore e minuti a step di 15 minuti)</li>
      <li>Seleziona il tipo di attivita dal menu a tendina</li>
      <li>Aggiungi eventuali note descrittive</li>
      <li>Clicca "Salva"</li>
    </ol>
    <div class="help-note">
      <strong>Nota:</strong> Le durate sono arrotonate a multipli di 15 minuti. Puoi usare il pulsante rapido per l'orario feriale.
    </div>
  </div>

  <div class="help-section">
    <h4>Visualizzazione Statistiche</h4>
    <ul>
      <li><strong>Ore Lavorate:</strong> Totale ore inserite per la giornata selezionata</li>
      <li><strong>Straordinari:</strong> Ore oltre le 8 ore standard (evidenziate in verde)</li>
      <li><strong>Attivita:</strong> Numero di attivita registrate</li>
      <li><strong>Stato Giornata:</strong> Completa (8h+) o Incompleta (&lt;8h)</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Tipo Autenticazione</h4>
    <p>Il badge accanto al tuo nome indica il tipo di autenticazione:</p>
    <ul>
      <li><strong>AD:</strong> Autenticato tramite Active Directory</li>
      <li><strong>Locale:</strong> Autenticato con credenziali locali</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Eliminazione Attivita</h4>
    <p>Per eliminare un'attivita, clicca sul pulsante "Elimina" nella riga corrispondente.</p>
    <div class="help-warning">
      <strong>Attenzione:</strong> L'eliminazione e permanente e non puo essere annullata.
    </div>
  </div>

  <div class="help-section">
    <h4>Navigazione Date</h4>
    <ul>
      <li>Usa il selettore di data per visualizzare attivita di giorni diversi</li>
      <li>Clicca "Oggi" per tornare velocemente alla data corrente</li>
      <li>Clicca "Carica" per aggiornare le attivita della data selezionata</li>
    </ul>
  </div>
`;

const adminDashboardHelp = `
  <div class="help-section">
    <h3>Dashboard Admin - Monitoraggio</h3>
    <p>Pannello di controllo per monitorare le attivita di tutti gli utenti del sistema.</p>
  </div>

  <div class="help-section">
    <h4>Filtri di Ricerca</h4>
    <ul>
      <li><strong>Data:</strong> Seleziona la giornata da monitorare</li>
      <li><strong>Utente:</strong> Filtra per username (ricerca parziale)</li>
      <li><strong>Stato:</strong> Filtra per stato completamento (OK/Incompleto/Assente)</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Interpretazione Stati</h4>
    <ul>
      <li><strong>OK:</strong> Utente ha completato 8+ ore</li>
      <li><strong>Incompleto:</strong> Utente ha inserito attivita ma &lt;8 ore</li>
      <li><strong>Assente:</strong> Nessuna attivita registrata</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Colonna Tipo Utente</h4>
    <p>Indica la modalita di autenticazione dell'utente:</p>
    <ul>
      <li><strong>AD:</strong> Utente gestito da Active Directory</li>
      <li><strong>Locale:</strong> Utente con credenziali locali</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Statistiche Riepilogative</h4>
    <p>Le card in alto mostrano:</p>
    <ul>
      <li>Totale utenti visualizzati (dopo filtri)</li>
      <li>Numero utenti con stato OK</li>
      <li>Numero utenti con stato Incompleto</li>
      <li>Numero utenti Assenti</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Export Dati</h4>
    <p>Accedi alla sezione "Export" per esportare dati in formato CSV o JSON per periodi personalizzati.</p>
  </div>
`;

const adminSettingsHelp = `
  <div class="help-section">
    <h3>Configurazione Server</h3>
    <p>Pannello per configurare le impostazioni globali del sistema.</p>
  </div>

  <div class="help-section">
    <h4>Configurazione LDAP/Active Directory</h4>
    <ul>
      <li><strong>Abilita LDAP:</strong> Attiva l'autenticazione tramite Active Directory</li>
      <li><strong>URL LDAP:</strong> Indirizzo del server LDAP (es: ldap://dc.company.local:389)</li>
      <li><strong>Base DN:</strong> Distinguished Name base (es: DC=company,DC=local)</li>
      <li><strong>User Search Filter:</strong> Filtro per ricerca utenti (default: sAMAccountName)</li>
      <li><strong>Gruppo Richiesto:</strong> Gruppo AD richiesto per l'accesso</li>
    </ul>
    <div class="help-warning">
      <strong>Importante:</strong> Modifiche alla configurazione LDAP richiedono il riavvio del server per essere applicate.
    </div>
  </div>

  <div class="help-section">
    <h4>Configurazione HTTPS</h4>
    <p>Si raccomanda l'uso di un reverse proxy (nginx/Apache) invece di HTTPS diretto.</p>
    <ul>
      <li><strong>Abilita HTTPS:</strong> Solo per HTTPS diretto (sconsigliato in produzione)</li>
      <li><strong>Percorso Certificato:</strong> Path assoluto al file .pem del certificato</li>
      <li><strong>Percorso Chiave Privata:</strong> Path assoluto alla chiave privata</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Import/Export Configurazione</h4>
    <p>Esporta o importa sezioni di configurazione selezionate:</p>
    <ul>
      <li>Seleziona le sezioni da includere (impostazioni, turni, utenti, attivita, ecc.)</li>
      <li>L'import sovrascrive i dati esistenti delle sezioni selezionate</li>
      <li>Effettua sempre un backup prima dell'import</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Gestione Categorie Attivita</h4>
    <p>Configura le categorie disponibili nel menu a tendina degli utenti:</p>
    <ul>
      <li>Aggiungi nuove categorie inserendo il nome e cliccando "Aggiungi"</li>
      <li>Rimuovi categorie esistenti cliccando sulla "x" accanto al nome</li>
      <li>Le modifiche sono immediate e visibili a tutti gli utenti</li>
    </ul>
    <div class="help-note">
      <strong>Nota:</strong> Non e possibile eliminare tutte le categorie. Deve rimanere almeno una categoria attiva.
    </div>
  </div>

  <div class="help-section">
    <h4>Logging</h4>
    <p>Configura le categorie di log per il debugging:</p>
    <ul>
      <li><strong>LDAP/AD:</strong> Autenticazione e ricerche Active Directory</li>
      <li><strong>HTTP:</strong> Richieste e risposte HTTP</li>
      <li><strong>Server:</strong> Eventi di avvio/arresto server</li>
      <li><strong>Settings:</strong> Modifiche alle configurazioni</li>
      <li><strong>Errors:</strong> Errori applicativi</li>
      <li><strong>Audit:</strong> Azioni utente (login, modifiche dati)</li>
    </ul>
  </div>
`;

const adminExportHelp = `
  <div class="help-section">
    <h3>Export Dati Attivita</h3>
    <p>Esporta i dati delle attivita in vari formati per analisi e reportistica.</p>
  </div>

  <div class="help-section">
    <h4>Range Rapido</h4>
    <p>Usa i pulsanti rapidi per selezionare periodi comuni:</p>
    <ul>
      <li><strong>Oggi/Ieri:</strong> Singola giornata</li>
      <li><strong>Settimana:</strong> Corrente o scorsa (Lun-Dom)</li>
      <li><strong>Mese:</strong> Corrente o precedente</li>
      <li><strong>Anno:</strong> Da inizio anno ad oggi</li>
      <li><strong>Tutti:</strong> Tutti i dati disponibili</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Selezione Utenti</h4>
    <p>Seleziona gli utenti da includere nell'export:</p>
    <ul>
      <li>Usa "Tutti gli utenti" per un export completo</li>
      <li>Deseleziona per scegliere utenti specifici</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Tipi di Export</h4>
    <ul>
      <li><strong>Dettagliato:</strong> Ogni attivita come riga separata</li>
      <li><strong>Riepilogo:</strong> Totali aggregati per utente/giorno</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Formati Disponibili</h4>
    <ul>
      <li><strong>XLSX:</strong> Excel, ideale per analisi e pivot table</li>
      <li><strong>CSV:</strong> Compatibile con tutti i software, streaming per grandi dataset</li>
      <li><strong>JSON:</strong> Per integrazioni e automazioni</li>
    </ul>
    <div class="help-note">
      <strong>Consiglio:</strong> Per dataset molto grandi preferisci CSV che usa streaming.
    </div>
  </div>
`;

const adminShiftsHelp = `
  <div class="help-section">
    <h3>Gestione Turni</h3>
    <p>Configura i tipi di turno e i preset contrattuali disponibili nel sistema.</p>
  </div>

  <div class="help-section">
    <h4>Tipi di Turno</h4>
    <p>Ogni turno definisce:</p>
    <ul>
      <li><strong>Giorni lavorativi:</strong> Quali giorni della settimana sono attivi</li>
      <li><strong>Weekend:</strong> Se includere sabato e domenica</li>
      <li><strong>Festivita:</strong> Se includere giorni festivi</li>
      <li><strong>Contratto:</strong> Ore settimanali previste</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Predefiniti Nuovi Utenti</h4>
    <p>Seleziona turno e contratto da assegnare automaticamente:</p>
    <ul>
      <li>Al primo accesso di utenti AD</li>
      <li>Alla creazione di utenti locali</li>
    </ul>
    <div class="help-warning">
      <strong>Attenzione:</strong> Le modifiche ai predefiniti richiedono il riavvio del server.
    </div>
  </div>

  <div class="help-section">
    <h4>Preset Contratti</h4>
    <p>Definisci preset riutilizzabili per i turni:</p>
    <ul>
      <li><strong>Full-time:</strong> Tipicamente 40h/settimana</li>
      <li><strong>Part-time:</strong> Ore ridotte personalizzabili</li>
      <li><strong>Personalizzato:</strong> Configurazione libera</li>
    </ul>
  </div>
`;

const adminUsersHelp = `
  <div class="help-section">
    <h3>Gestione Utenti</h3>
    <p>Visualizza, crea e gestisci gli utenti del sistema.</p>
  </div>

  <div class="help-section">
    <h4>Tipi di Utente</h4>
    <ul>
      <li><strong>AD:</strong> Autenticati tramite Active Directory, creati al primo login</li>
      <li><strong>Locale:</strong> Credenziali gestite localmente</li>
    </ul>
  </div>

  <div class="help-section">
    <h4>Creazione Utente Locale</h4>
    <ol>
      <li>Clicca "Nuovo Utente Locale"</li>
      <li>Compila username, password e nome visualizzato</li>
      <li>Seleziona turno e preset contratto</li>
      <li>Clicca "Crea Utente"</li>
    </ol>
  </div>

  <div class="help-section">
    <h4>Gestione Profilo</h4>
    <ul>
      <li><strong>Modifica:</strong> Aggiorna turno, contratto e dettagli</li>
      <li><strong>Reset Password:</strong> Solo per utenti locali</li>
      <li><strong>Elimina:</strong> Solo utenti locali (i dati attivita vengono mantenuti)</li>
    </ul>
    <div class="help-warning">
      <strong>Attenzione:</strong> Gli utenti AD non possono essere eliminati manualmente.
    </div>
  </div>
`;

const adminQuickActionsHelp = `
  <div class="help-section">
    <h3>Quick Action</h3>
    <p>Configura le azioni rapide disponibili nel calendario utenti.</p>
  </div>

  <div class="help-section">
    <h4>Cosa sono le Quick Action</h4>
    <p>Permettono agli utenti di impostare rapidamente una giornata intera con un singolo click dal calendario mensile.</p>
  </div>

  <div class="help-section">
    <h4>Creazione Quick Action</h4>
    <ol>
      <li>Inserisci un'etichetta descrittiva (es: "Smart working")</li>
      <li>Aggiungi note opzionali</li>
      <li>Clicca "Salva"</li>
    </ol>
  </div>

  <div class="help-section">
    <h4>Utilizzo da parte degli Utenti</h4>
    <p>Nella dashboard utente:</p>
    <ul>
      <li>Seleziona un giorno dal calendario</li>
      <li>Clicca su una quick action per applicarla</li>
      <li>L'attivita viene registrata per l'intera giornata</li>
    </ul>
  </div>
`;
