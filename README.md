# OnlyUserActivity

Sistema web per il tracciamento delle attività giornaliere degli utenti con autenticazione locale o LDAP, dashboard utente e pannello amministrativo per configurazioni, monitoraggio ed export.

## Caratteristiche principali

- **Autenticazione utente**: locale con password hashate oppure LDAP/AD.
- **Dashboard utente**: inserimento attività, calendario mensile, riepilogo giornaliero e quick actions.
- **Pannello admin**: monitoraggio presenze, gestione utenti locali, turni, preset contratti, tipi attività e impostazioni server.
- **Log audit**: registrazione eventi in formato JSONL con opzione di redazione payload.
- **Export dati**: CSV/JSON/XLSX con riepiloghi o dettagli.
- **Sicurezza**: rate limiting, CSP con nonce, sessioni separate admin/utente, JWT per API.

## Stack tecnologico

- **Node.js + Express**
- **EJS** per le viste HTML
- **JWT** per le API
- **LDAP** tramite `ldapts` (opzionale)
- **Storage file-based** in cartelle locali (JSON/JSONL)

## Struttura del progetto

```
src/
  app.js                # Configurazione Express, middleware, route
  server.js             # Avvio server HTTP/HTTPS
  config/               # Caricamento/validazione variabili d'ambiente
  middlewares/          # Auth, error handling, rate limiting, validation
  routes/               # API e pagine admin/utente
  services/             # Logica business e storage
  views/                # Template EJS
public/
  css/                  # Stili
  js/                   # Script frontend
```

## Requisiti

- Node.js 18+ (consigliato)
- npm 9+ (consigliato)

## Installazione

```bash
npm install
```

## Avvio

### Ambiente di sviluppo

```bash
npm run dev
```

### Ambiente di produzione

```bash
npm start
```

Il server è configurato per avviarsi su `SERVER_HOST` e `SERVER_PORT`.

## Configurazione (variabili d'ambiente)

Il progetto usa `.env`. Se mancante, viene copiato da `.env.example` automaticamente al primo avvio.

### Principali variabili

| Variabile | Descrizione | Default |
| --- | --- | --- |
| `NODE_ENV` | Ambiente (`development`/`production`) | `development` |
| `SERVER_HOST` | Host server | `0.0.0.0` |
| `SERVER_PORT` | Porta server | `3001` |
| `TRUST_PROXY` | Numero proxy fidati | `0` |
| `HTTPS_ENABLED` | Abilita HTTPS | `false` |
| `HTTPS_CERT_PATH` | Percorso certificato | — |
| `HTTPS_KEY_PATH` | Percorso chiave | — |
| `JWT_SECRET` | Segreto JWT | `change-me-in-production` |
| `LDAP_ENABLED` | Abilita LDAP | `false` |
| `DATA_ROOT_PATH` | Root storage file | `./data` |
| `AUDIT_LOG_RETENTION_DAYS` | Retention audit | `730` |
| `ADMIN_DEFAULT_USERNAME` | Admin predefinito | `admin` |
| `ADMIN_DEFAULT_PASSWORD` | Password admin predefinita | `admin` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit API | `100` |
| `LOGIN_RATE_LIMIT_MAX` | Max tentativi login | `5` |
| `ACTIVITY_REQUIRED_MINUTES` | Minuti richiesti/giorno | `480` |

> **Nota**: in `production` è obbligatorio cambiare `JWT_SECRET` e `ADMIN_SESSION_SECRET`.

## Storage e file generati

I dati sono salvati in `DATA_ROOT_PATH` (default `./data`):

- `users/` — profili utenti locali
- `activities/` — attività per mese/utente (JSON)
- `admin/` — configurazioni (tipi attività, quick actions, credenziali admin)
- `audit/` — log audit giornalieri (JSONL)
- `locks/` — lock file per scritture concorrenti

## Flusso di autenticazione

- **Utenti**: login via `/user/auth/login`.
  - Se LDAP attivo, la UI permette scelta del metodo.
  - La sessione contiene JWT per le chiamate API.
- **Admin**: login via `/admin/auth/login` con credenziali archiviate in `data/admin/credentials.json`.

## API principali

Tutte le API protette richiedono header:

```
Authorization: Bearer <token>
```

### Autenticazione API

- `POST /api/auth/login` — login utente (LDAP o local)

### Attività

- `GET /api/activities/init?date=YYYY-MM-DD` — inizializzazione dashboard
- `GET /api/activities/types` — elenco tipi attività
- `GET /api/activities/quick-actions` — quick actions
- `GET /api/activities/month?date=YYYY-MM-DD` — calendario mensile
- `GET /api/activities/:date` — attività del giorno
- `POST /api/activities` — crea attività
- `PUT /api/activities/:id?date=YYYY-MM-DD` — aggiorna attività
- `DELETE /api/activities/:id?date=YYYY-MM-DD` — elimina attività
- `GET /api/activities?from=YYYY-MM-DD&to=YYYY-MM-DD` — range attività

### Admin (HTML)

- `/admin/dashboard` — dashboard monitoraggio
- `/admin/users` — gestione utenti locali
- `/admin/shifts` — turni e preset contratti
- `/admin/settings` — configurazioni server

### Admin (API)

- `/admin/api/quick-actions` — CRUD quick actions
- `/admin/api/shift-types` — CRUD turni
- `/admin/api/contract-presets` — CRUD preset contratti
- `/admin/api/settings/*` — configurazioni server e diagnostica
- `/admin/api/users` — CRUD utenti locali
- `/admin/api/server/info` — info server
- `/admin/api/server/restart` — riavvio server

## Log e audit

- I log applicativi possono essere scritti su file (`LOG_TO_FILE=true`).
- Gli audit log sono salvati come righe JSON (`.jsonl`) e possono redigere i payload con `AUDIT_PAYLOAD_MODE=redacted`.

## Testing

```bash
npm test
```

## Note operative

- In HTTPS, assicurarsi che `HTTPS_CERT_PATH` e `HTTPS_KEY_PATH` siano validi.
- Per ambienti dietro reverse proxy impostare `TRUST_PROXY` adeguatamente.
- Il sistema applica rate limiting alle API e ai login.

## Licenza

ISC (vedi `package.json`).
