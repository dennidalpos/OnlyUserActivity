# Activity Tracker

Sistema Node.js/Express con dashboard EJS per tracciare attività giornaliere, gestire turni e configurazioni amministrative, con esportazione dati in CSV/JSON/XLSX.

## Panoramica

L'applicazione è pensata per team che registrano attività quotidiane e per amministratori che monitorano avanzamento, compliance e reportistica. Sono previste due aree principali:

- **Dashboard utente**: inserimento attività, gestione del calendario mensile, quick action e riepiloghi.
- **Dashboard admin**: monitoraggio giornaliero, gestione utenti, turni, impostazioni avanzate e logging.

## Architettura e stack

- **Backend**: Express con middleware per sicurezza (helmet), rate limiting e logging.
- **View layer**: EJS con script client-side in `public/js`.
- **Storage**: file JSON in `data/` (attività, utenti, configurazioni).
- **Auth**: LDAP/Active Directory opzionale, più credenziali locali.

## Struttura del progetto

- `src/app.js`: bootstrap Express, middleware, route principali.
- `src/routes/`: endpoint API e pagine admin/user.
- `src/services/`: logica di business (attività, utenti, export, logging, settings).
- `src/views/`: template EJS per dashboard admin e user.
- `public/`: asset statici CSS/JS.
- `data/`: archivio JSON persistente (deve essere scrivibile).
- `scripts/`: utility per operazioni manuali.

## Requisiti

- Node.js >= 18
- npm >= 9
- Directory `data/` scrivibile

## Installazione

```bash
npm install
```

## Avvio

### Modalità sviluppo

```bash
npm run dev
```

### Modalità produzione

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
- `LDAP_REQUIRED_GROUP` può essere nome semplice o DN completo.
- È supportato il primary group (es. "Domain Users").

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

## Funzionalità principali

### Gestione attività (utente)

- Inserimento attività con durata (ore/minuti) o intervalli (HH:MM, step 15 minuti).
- Tipo attività `altro` con specifica custom.
- Calendario mensile con indicatori di completamento.

### Monitoraggio e export (admin)

- Stato giornaliero utenti e aggregati di periodo.
- Export CSV/JSON/XLSX con report dettagliati o riepilogativi.
- Parametri esportati: email, reparto, turno, metadata, timestamp principali, attività.

### Gestione utenti e turni (admin)

- Visualizzazione utenti AD e locali con filtri e ricerca.
- Creazione utenti locali con turno e preset contratto.
- Reset password e aggiornamenti profilo.
- Gestione turni, preset contratti e predefiniti di onboarding.

### Import/Export configurazione (admin)

Dalla sezione **Configurazione** è possibile esportare o importare un file JSON selezionando le sezioni desiderate:

- Impostazioni server
- Tipi attività
- Turni
- Preset contratti
- Quick action
- Utenti
- Attività

Le sezioni selezionate vengono sovrascritte durante l'import. Effettuare un export di backup prima di procedere.

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

## Sicurezza e raccomandazioni

- Impostare segreti lunghi e non riutilizzati (`JWT_SECRET`, `ADMIN_SESSION_SECRET`).
- Usare HTTPS in ambienti produttivi.
- Limitare l'accesso alla dashboard admin a reti fidate o tramite reverse proxy.

