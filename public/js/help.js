/**
 * HelpSystem - Global help modal system
 * Styles are defined in admin.css (.help-btn, .help-modal, .help-section, etc.)
 */
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
      <li>Inserisci l'orario di inizio e fine (step di 15 minuti)</li>
      <li>Seleziona il tipo di attivita dal menu a tendina</li>
      <li>Aggiungi eventuali note descrittive</li>
      <li>Clicca "Salva"</li>
    </ol>
    <div class="help-note">
      <strong>Nota:</strong> Gli orari devono essere multipli di 15 minuti (es: 09:00, 09:15, 09:30, 09:45).
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
    <h4>Gestione Utenti Locali</h4>
    <p>Crea e gestisci utenti con autenticazione locale:</p>
    <ul>
      <li><strong>Nuovo Utente:</strong> Clicca "+ Nuovo Utente Locale" per creare un account</li>
      <li><strong>Eliminazione:</strong> Solo utenti locali possono essere eliminati</li>
      <li><strong>Utenti AD:</strong> Vengono creati automaticamente al primo login e non possono essere eliminati manualmente</li>
    </ul>
    <div class="help-warning">
      <strong>Attenzione:</strong> L'eliminazione di un utente locale e permanente. I dati delle attivita dell'utente verranno mantenuti.
    </div>
  </div>
`;
