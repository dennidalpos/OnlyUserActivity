# Activity Tracker

Sistema Node.js/Express con dashboard EJS per tracciare le attività giornaliere, gestire turni e configurazioni amministrative, con esportazione dati in CSV/JSON/XLSX.

## Funzionalità principali

- Autenticazione utenti con LDAP/Active Directory o credenziali locali.
- Dashboard utente per inserimento attività, riepiloghi e calendario mensile.
- Dashboard admin per monitoraggio, gestione utenti, turni, impostazioni e logging.
- Esportazione dati attività con report dettagliati e riepilogativi.
- Gestione dei tipi di attività e preset contratti da UI admin.

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

## Inserimento attività (utente)

- Le attività possono essere inserite con durata (ore/minuti) o con orari espliciti (HH:MM, step 15 minuti).
- Il tipo attività `altro` richiede la specifica del tipo personalizzato.
- È disponibile un pulsante rapido per creare l'orario feriale 08:30-17:00 con pausa 12:30-13:00.

## Export dati

- CSV, JSON o XLSX.
- Report dettagliato o riepilogativo.
- Include parametri utente (email, reparto, turno, metadata, timestamp principali) insieme alle attività.

## Script utili

```bash
node scripts/create-user.js
node scripts/seed-test-users.js
node scripts/restart-server.js
```

## Prompt operativo per Claude

Prompt suggerito per analisi e manutenzione:

"Sei un auditor software. Analizza il progetto Activity Tracker (Node.js + Express + EJS) considerando sicurezza, qualità, edge case e corrispondenza tra backend e UI. Fornisci un report per file/endpoint con motivazioni tecniche e suggerisci correzioni concrete."
