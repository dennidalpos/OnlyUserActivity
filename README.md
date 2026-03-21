# OnlyUserActivity

Sistema web per il tracciamento delle attività giornaliere degli utenti con autenticazione locale o LDAP, dashboard utente e pannello amministrativo per configurazioni, monitoraggio ed export.

## Caratteristiche principali

- **Autenticazione utente**: locale con password hashate oppure LDAP/AD.
- **Dashboard utente**: inserimento attività, calendario mensile, riepilogo giornaliero e quick actions.
- **Pannello admin**: monitoraggio presenze, gestione utenti locali, turni, preset contratti, tipi attività e impostazioni server.
- **Carico orario per utente**: minuti richiesti giornalieri calcolati dai preset contratto assegnati a turno o utente.
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
scripts/
  *.ps1                 # Automazione locale e packaging MSI Windows
src/
  app.js                # Configurazione Express, middleware, route
  server.js             # Avvio server HTTP/HTTPS
  config/               # Caricamento/validazione variabili d'ambiente
  middlewares/          # Auth, error handling, rate limiting, validation
  routes/               # API e pagine admin/utente
  services/             # Logica business e storage
  views/                # Template EJS
tests/
  *.test.js             # Test automatici Jest e integrazione
public/
  css/                  # Stili
  js/                   # Script frontend
tools/
  msi/                  # Template WiX del pacchetto MSI
```

## Requisiti

- Node.js 18+ (consigliato)
- npm 9+ (consigliato)

## Installazione

```bash
npm run bootstrap
copy .env.example .env
npm run doctor
```

Compilare poi `.env` prima del primo avvio. Il bootstrap installa le dipendenze ma non copia automaticamente `.env.example`, così l'ambiente iniziale resta esplicito e verificabile.

## Build

I comandi canonici del repository sono:

- `npm run bootstrap` - installa le dipendenze di progetto
- `npm run doctor` - verifica prerequisiti, `.env` e tool locali
- `npm run compile` - dichiara esplicitamente che non esiste una fase di compilazione separata
- `npm run build` - esegue `doctor` e `compile`
- `npm test` - esegue la suite Jest
- `npm run pack` - genera il pacchetto MSI Windows
- `npm run publish` - copia gli artefatti pacchettizzati in `artifacts/publish`
- `npm run clean` - rimuove gli output locali generati

Non e' previsto uno step di compilazione applicativa: il progetto viene eseguito direttamente con Node.js.

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

Il progetto usa `.env`. Partire da `.env.example`, copiarlo manualmente in `.env` e completare i valori richiesti prima dell'avvio.

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
| `ALLOW_PROCESS_SUPERVISOR_RESTART` | Abilita restart remoto solo sotto supervisore | `false` |
| `ACTIVITY_REQUIRED_MINUTES` | Minuti richiesti/giorno | `480` |

> **Nota**: in `production` è obbligatorio cambiare `JWT_SECRET` e `ADMIN_SESSION_SECRET`; con i valori di default l'applicazione fallisce intenzionalmente il bootstrap.

## Storage e file generati

I dati sono salvati in `DATA_ROOT_PATH` (default `./data`):

- `users/` — profili utenti locali
- `activities/` — attività per mese/utente (JSON)
- `admin/` — configurazioni (tipi attività, quick actions, credenziali admin)
- `audit/` — log audit giornalieri (JSONL)
- `locks/` — lock file per scritture concorrenti

## Flusso di autenticazione

- **Utenti**: login via `/user/auth/login`.
  - Se LDAP attivo, UI e API permettono scelta esplicita tra login locale e LDAP.
  - La sessione contiene JWT per le chiamate API.
- **Admin**: login via `/admin/auth/login` con credenziali archiviate in `data/admin/credentials.json`.
  - Le mutazioni admin cookie-auth sono protette da token CSRF di sessione.

## API principali

Tutte le API protette richiedono header:

```
Authorization: Bearer <token>
```

### Autenticazione API

- `POST /api/auth/login` — login utente; con LDAP attivo accetta `authMethod=local|ldap`

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
- `/admin/api/server/restart` — richiesta riavvio solo se il processo gira sotto supervisore configurato

## Log e audit

- I log applicativi possono essere scritti su file (`LOG_TO_FILE=true`).
- Gli audit log sono salvati come righe JSON (`.jsonl`) e redigono password, secret, token e payload sensibili anche in modalità `partial`.

## Testing

```bash
npm test
```

Per coverage:

```bash
npm run test:coverage
```

Output coverage:

- `artifacts/test-results/coverage/`

## Clean

```bash
npm run clean
```

Il comando rimuove gli output locali non versionati (`artifacts/`, `coverage/`, `logs/`, `test-data/`, `build/`, `dist/`, `out/`, `publish/`, `tmp/`, `public/build/`) e preserva `data/`, che contiene lo stato applicativo file-based.

## Publish o packaging

Il repository include una pipeline MSI per Windows:

```bash
npm run pack
```

La build usa:

- `scripts/stage-windows-package.ps1` per creare uno stage installabile con dipendenze production;
- `scripts/build-msi.ps1` per harvesting WiX e generazione del pacchetto;
- `tools/msi/OnlyUserActivity.wxs` come template WiX principale;
- `tools/wix314-binaries/` come sorgente locale preferita per `heat.exe`, `candle.exe` e `light.exe`;
- `tools/nssm/` come binari locali NSSM inclusi nel pacchetto.

Output predefinito:

- MSI in `artifacts/packages/onlyuseractivity-<version>-x64.msi`
- stage e file intermedi in `artifacts/build/windows-msi/`

Per pubblicare localmente gli artefatti gia' prodotti in una destinazione separata:

```bash
npm run publish
```

Output publish:

- artefatti copiati in `artifacts/publish/`
- manifest locale in `artifacts/publish/manifest.json`

### Layout installazione MSI

- File applicativi in `C:\Program Files\OnlyUserActivity`
- Configurazione e stato runtime in `%ProgramData%\Danny Perondi\OnlyUserActivity`
  - `.env`
  - `data/`
  - `logs/`

Alla prima installazione, se `%ProgramData%\Danny Perondi\OnlyUserActivity\.env` non esiste, viene creato copiando `.env.example`. Il servizio NSSM riceve inoltre queste variabili runtime:

- `ONLYUSERACTIVITY_ENV_PATH`
- `DATA_ROOT_PATH`
- `LOG_FILE_PATH`
- `ALLOW_PROCESS_SUPERVISOR_RESTART=true`

In questo modo aggiornamenti MSI futuri possono sostituire i file applicativi senza perdere configurazione e dati, mentre la disinstallazione completa rimuove servizio, log e contenuto residuo sotto `%ProgramData%\Danny Perondi\OnlyUserActivity`.

### Installazione silenziosa MSI

```powershell
msiexec /i artifacts\packages\onlyuseractivity-1.0.0-x64.msi /qn START_SERVICE=0
```

Proprieta' supportate:

- `INSTALL_SERVICE=1|0` per installare o meno il servizio NSSM
- `START_SERVICE=1|0` per avviare o meno il servizio al termine dell'installazione

La pipeline MSI e il servizio richiedono:

- Node.js 18+ installato sul sistema target;
- permessi amministrativi per installazione/rimozione del servizio Windows.

Per gestione manuale del servizio restano disponibili:

- `scripts/install-windows-service.ps1`
- `scripts/remove-windows-service.ps1`

Gli script cercano `nssm.exe` in:

- `tools/nssm/win64/nssm.exe`
- `tools/nssm/win32/nssm.exe`
- `nssm.exe` nella root del progetto

## Documentation

- `PROJECT_SPEC.md`
- `PROJECT_STATUS.json`
- `docs/setup-iniziale.md`

## Note operative

- In HTTPS, assicurarsi che `HTTPS_CERT_PATH` e `HTTPS_KEY_PATH` siano validi.
- Per ambienti dietro reverse proxy impostare `TRUST_PROXY` adeguatamente.
- Il sistema applica rate limiting alle API e ai login.
- La cancellazione di un utente locale rimuove anche attività e audit log associati; gli utenti AD non sono eliminabili manualmente.
- In deployment MSI, se `HTTPS_CERT_PATH` o `HTTPS_KEY_PATH` puntano a file fuori dalla cartella installata, usare percorsi assoluti nel file `%ProgramData%\Danny Perondi\OnlyUserActivity\.env`.

## Licenza

ISC (vedi `LICENSE`).
