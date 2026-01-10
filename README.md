# Activity Tracker

Sistema Node.js/Express con dashboard EJS per tracciare le attività giornaliere, gestire turni e configurazioni amministrative, con esportazione dati in CSV/JSON/XLSX.

## Funzionalità principali

- Autenticazione utenti con LDAP/Active Directory o credenziali locali.
- Dashboard utente per inserimento attività, riepiloghi e calendario mensile.
- Dashboard admin per monitoraggio, gestione utenti, turni, impostazioni e logging.
- Esportazione dati attività con report dettagliati e riepilogativi.
- Gestione dei tipi di attività e preset contratti da UI admin.
- Quick action per impostare rapidamente la giornata dal calendario utente.
- Import/Export configurazione selettivo con supporto a utenti e attività.

## Requisiti

- Node.js >= 18
- npm >= 9
- Directory `data/` scrivibile

## Installazione

```bash
npm install
```

## Avvio

```bash
npm run dev
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

## Accesso

- Dashboard utenti: `http://localhost:3001/user/auth/login`
- Dashboard admin: `http://localhost:3001/admin/auth/login` (default: admin/admin)

## Gestione utenti (admin)

La sezione **Gestione Utenti** (menu topbar) consente di:
- Visualizzare utenti AD e locali con filtri per tipo e ricerca.
- Creare utenti locali con turno e preset contratto.
- Aggiornare profilo, turno e preset contratto.
- Eliminare utenti locali o resettare la password locale.

Percorso: `http://localhost:3001/admin/users`

## Configurazione turni e predefiniti

In **Configurazione Turni** puoi:
- Definire tipi di turno e preset contratti.
- Impostare un turno e un preset contratto predefiniti da applicare al primo accesso degli utenti.
- Le modifiche ai predefiniti richiedono un riavvio del server.

Percorso: `http://localhost:3001/admin/shifts`

## Inserimento attività (utente)

- Le attività possono essere inserite con durata (ore/minuti) o con orari espliciti (HH:MM, step 15 minuti).
- Il tipo attività `altro` richiede la specifica del tipo personalizzato.

## Export dati

- CSV, JSON o XLSX.
- Report dettagliato o riepilogativo.
- Include parametri utente (email, reparto, turno, metadata, timestamp principali) insieme alle attività.

## Import / Export configurazione

Dalla sezione **Configurazione** è possibile esportare o importare un file JSON selezionando le sezioni desiderate:
- Impostazioni server
- Tipi attività
- Turni
- Preset contratti
- Quick action
- Utenti
- Attività

Le sezioni selezionate vengono sovrascritte durante l'import. Effettua un export di backup prima di procedere.

## Script utili

```bash
node scripts/create-user.js
node scripts/seed-test-users.js
node scripts/restart-server.js
```
