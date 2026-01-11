# Activity Tracker

Sistema Node.js/Express con dashboard EJS per tracciare attivita giornaliere, gestire turni e configurazioni amministrative, con esportazione dati in CSV/JSON/XLSX.

## Panoramica

L'applicazione e pensata per team che registrano attivita quotidiane e per amministratori che monitorano avanzamento, compliance e reportistica. Sono previste due aree principali:

- **Dashboard utente**: inserimento attivita, gestione del calendario mensile, quick action e riepiloghi.
- **Dashboard admin**: monitoraggio giornaliero, gestione utenti, turni, impostazioni avanzate e logging.

## Architettura e stack

- **Backend**: Express con middleware per sicurezza (helmet), rate limiting e logging.
- **View layer**: EJS con script client-side in `public/js`.
- **Storage**: file JSON in `data/` (attivita, utenti, configurazioni).
- **Auth**: LDAP/Active Directory opzionale, piu credenziali locali.
- **UI**: CSS modulare con design system basato su token (shared.css + admin.css/user.css).

## Struttura del progetto

```
src/
  app.js           # Bootstrap Express, middleware, route principali
  routes/          # Endpoint API e pagine admin/user
  services/        # Logica di business (attivita, utenti, export, logging, settings)
  views/           # Template EJS per dashboard admin e user
    admin/         # Dashboard, export, turni, utenti, impostazioni
    user/          # Dashboard utente, calendario, attivita

public/
  css/
    shared.css     # Token, componenti base, utility classes
    admin.css      # Stili specifici admin
    user.css       # Stili specifici utente
  js/
    dashboard.js   # Logica dashboard utente
    help.js        # Sistema guida contestuale
    ui-helper.js   # Notifiche e feedback UI

data/              # Archivio JSON persistente (deve essere scrivibile)
scripts/           # Utility per operazioni manuali
```

## Requisiti

- Node.js >= 18
- npm >= 9
- Directory `data/` scrivibile

## Installazione

```bash
npm install
```

## Avvio

### Modalita sviluppo

```bash
npm run dev
```

### Modalita produzione

```bash
npm start
```

## Configurazione

Le impostazioni sono gestite tramite `.env` e possono essere aggiornate dalla dashboard admin (Settings > Configurazione avanzata). Le modifiche applicate tramite UI vengono persistite nelle impostazioni e richiedono il riavvio del server.

Copia il file di esempio:

```bash
cp .env.example .env
```

### Variabili essenziali

```env
NODE_ENV=production
SERVER_PORT=3001
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ADMIN_SESSION_SECRET=your-admin-session-secret-min-32-chars
```

### Default nuovi utenti

```env
DEFAULT_USER_SHIFT=Feriali
DEFAULT_USER_CONTRACT_PRESET=full-time-40
```

- `DEFAULT_USER_SHIFT` applica un turno predefinito al primo accesso (LDAP) o alla creazione utenti locali.
- `DEFAULT_USER_CONTRACT_PRESET` assegna un preset contratto predefinito ai nuovi utenti.

### LDAP/Active Directory (opzionale)

```env
LDAP_ENABLED=true
LDAP_URL=ldaps://dc.company.local:636
LDAP_BASE_DN=DC=company,DC=local
LDAP_BIND_DN=CN=ServiceAccount,CN=Users,DC=company,DC=local
LDAP_BIND_PASSWORD=service_account_password
LDAP_USER_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_REQUIRED_GROUP=Domain Users
```

Note LDAP:
- `LDAP_REQUIRED_GROUP` puo essere nome semplice o DN completo.
- E supportato il primary group (es. "Domain Users").

### HTTPS

Per abilitare HTTPS configurare:

```env
HTTPS_ENABLED=true
HTTPS_CERT_PATH=/path/to/cert.pem
HTTPS_KEY_PATH=/path/to/key.pem
```

La dashboard admin fornisce pulsanti di verifica file e test HTTPS nelle impostazioni avanzate.

### Logging

```env
LOG_LEVEL=info
LOG_TO_FILE=false
LOG_FILE_PATH=./logs/app.log
LOG_LDAP=false
LOG_HTTP=false
LOG_SERVER=false
LOG_SETTINGS=false
LOG_ERRORS=false
LOG_AUDIT=false
```

Abilitare categorie specifiche permette di osservare eventi mirati senza incrementare troppo i log.

## Accesso

- Dashboard utenti: `http://localhost:3001/user/auth/login`
- Dashboard admin: `http://localhost:3001/admin/auth/login` (default: admin/admin)

## Funzionalita principali

### Gestione attivita (utente)

- Inserimento attivita con durata (ore/minuti) o intervalli (HH:MM, step 15 minuti).
- Tipo attivita `altro` con specifica custom.
- Calendario mensile con indicatori di completamento e quick action.
- Guida contestuale accessibile dal pulsante "?" in ogni pagina.

### Monitoraggio e export (admin)

- Stato giornaliero utenti e aggregati di periodo (giorno/settimana/mese/anno).
- Filtri per username e stato completamento.
- Export CSV/JSON/XLSX con report dettagliati o riepilogativi.
- Parametri esportati: email, reparto, turno, metadata, timestamp principali, attivita.

### Gestione utenti e turni (admin)

- Visualizzazione utenti AD e locali con filtri e ricerca.
- Creazione utenti locali con turno e preset contratto.
- Reset password e aggiornamenti profilo.
- Gestione turni, preset contratti e predefiniti di onboarding.
- Configurazione quick action per il calendario utenti.

### Import/Export configurazione (admin)

Dalla sezione **Configurazione** e possibile esportare o importare un file JSON selezionando le sezioni desiderate:

- Impostazioni server
- Tipi attivita
- Turni
- Preset contratti
- Quick action
- Utenti
- Attivita

Le sezioni selezionate vengono sovrascritte durante l'import. Effettuare un export di backup prima di procedere.

## UI e design system

L'interfaccia utilizza un design system modulare basato su CSS custom properties:

- **Token**: colori, spaziature, tipografia, ombre definiti in `:root`
- **Componenti base**: `.btn`, `.card`, `.panel`, `.alert`, `.badge`
- **Utility classes**: margini, padding, flex, gap, allineamento testo
- **Varianti pulsanti**: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-outline`, `.btn-toggle`
- **Checkbox**: `.checkbox-inline`, `.checkbox-group` per allineamento consistente

## Guida contestuale

Ogni pagina admin include un pulsante "?" (in basso a destra) che apre una guida specifica per quella sezione. Le guide spiegano:

- Funzionalita disponibili
- Passaggi per le operazioni comuni
- Note e avvertenze importanti

## Script utili

```bash
node scripts/create-user.js
node scripts/seed-test-users.js
node scripts/restart-server.js
```

## Dati e storage

I dati sono persistiti in `data/` come file JSON. Assicurarsi che la directory sia scrivibile dal processo Node.js. Le operazioni di import/export e i backup di configurazione si appoggiano alla stessa area.

## Troubleshooting rapido

- **Login admin**: verificare `ADMIN_SESSION_SECRET` e credenziali locali.
- **LDAP**: controllare URL, Base DN e Bind DN, e usare `ldaps://` per connessioni sicure.
- **HTTPS**: verificare che i path di certificato e chiave siano accessibili dal server.
- **Export**: per dataset grandi preferire CSV con streaming.
- **UI**: se gli stili non si caricano, verificare che `public/css/` sia accessibile.

## Sicurezza e raccomandazioni

- Impostare segreti lunghi e non riutilizzati (`JWT_SECRET`, `ADMIN_SESSION_SECRET`).
- Usare HTTPS in ambienti produttivi.
- Limitare l'accesso alla dashboard admin a reti fidate o tramite reverse proxy.
