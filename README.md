# Activity Tracker

Sistema per il tracciamento delle attività giornaliere con autenticazione locale o LDAP/AD, dashboard web per utenti e admin, esportazione dati e gestione turni.

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
# sviluppo (nodemon)
npm run dev

# produzione
npm start
```

## Configurazione

La maggior parte delle impostazioni è configurabile dalla **dashboard admin** (`Settings` > `Configurazione avanzata`).

Le variabili in `.env` vengono caricate all'avvio e possono essere modificate dall'interfaccia web:

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

Autenticazione contro server LDAP o Active Directory:

```env
LDAP_ENABLED=true
LDAP_URL=ldaps://dc.company.local:636
LDAP_BASE_DN=DC=company,DC=local
LDAP_BIND_DN=CN=ServiceAccount,CN=Users,DC=company,DC=local
LDAP_BIND_PASSWORD=service_account_password
LDAP_USER_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_REQUIRED_GROUP=Domain Users
```

**Note:**
- `LDAP_REQUIRED_GROUP` può essere specificato come nome semplice (`Domain Users`) o DN completo
- Il sistema supporta automaticamente il primary group (es. "Domain Users" come gruppo primario)
- Per debug LDAP: abilitare dalla dashboard admin in `Settings` > `Logging` > checkbox "Debug LDAP/AD"

### Logging

Sistema di logging modulare configurabile dalla dashboard admin (`Settings` > `Logging`) o tramite variabili `.env`.

#### Impostazioni globali

```env
LOG_LEVEL=info              # trace, debug, info, warn, error, fatal
LOG_TO_FILE=false           # Salvataggio su file
LOG_FILE_PATH=./logs/app.log
```

#### Categorie log (controllo granulare)

Ogni categoria può essere abilitata/disabilitata indipendentemente senza sovrapposizioni:

```env
LOG_LDAP=false      # LDAP/AD: autenticazione, gruppi, ricerche LDAP
LOG_HTTP=false      # HTTP: richieste fallite (4xx, 5xx)
LOG_SERVER=false    # Server: avvio, arresto, riavvio
LOG_SETTINGS=false  # Settings: modifiche configurazione e .env
LOG_ERRORS=false    # Errors: eccezioni non gestite ed errori critici
LOG_AUDIT=false     # Audit: log strutturato (login, attività CRUD)
```

**Esempio**: Abilitare solo log LDAP e Settings per debug configurazione:
```env
LOG_LDAP=true
LOG_SETTINGS=true
# Tutti gli altri LOG_* rimangono false
```

## Script utili

```bash
# crea un utente locale
node scripts/create-user.js

# genera utenti e attività di test
node scripts/seed-test-users.js
```

## Accesso

- Dashboard utenti: `http://localhost:3001/user/auth/login`
- Dashboard admin: `http://localhost:3001/admin/auth/login` (default: admin/admin)
