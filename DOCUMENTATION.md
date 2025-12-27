# OnlyUserActivity – Documentazione dettagliata

## Panoramica
OnlyUserActivity è un monorepo che contiene:
- **Server API** (`server/`): servizio Node/Express che gestisce autenticazione, attività giornaliere, report e audit.
- **Dashboard** (`dashboard/`): applicazione Node/Express con viste EJS per il monitoraggio e la gestione delle attività.
- **Shared** (`shared/`): libreria condivisa per la normalizzazione degli utenti.
- **Agent Windows** (`agent-windows/`): soluzione .NET per un agente Windows (build via MSBuild).

## Avvio rapido
### Server API
```bash
cd server
npm install
npm run dev
```
Per eseguire in modalità produzione:
```bash
npm run start
```

### Dashboard
```bash
cd dashboard
npm install
npm run dev
```
Per eseguire in modalità produzione:
```bash
npm run start
```

### Agent Windows
```bash
msbuild agent-windows/OnlyUserActivity.Agent.sln /p:Configuration=Release
```
Se `msbuild` non è nel `PATH`, usare il percorso completo fornito da Visual Studio Build Tools, ad esempio:
```powershell
"& \"C:\\Program Files (x86)\\Microsoft Visual Studio\\18\\BuildTools\\MSBuild\\Current\\Bin\\amd64\\MSBuild.exe\" agent-windows\\OnlyUserActivity.Agent.sln /p:Configuration=Release"
```

## Struttura del progetto
```
OnlyUserActivity/
├─ server/              # API server
│  └─ src/index.ts      # Entrypoint Express
├─ dashboard/           # Dashboard web
│  └─ src/index.ts      # Entrypoint Express
│  └─ src/views/        # Template EJS
├─ shared/              # Funzioni condivise
│  └─ index.ts          # computeUserKey
├─ agent-windows/       # Agente Windows (.NET)
├─ deploy/              # Script/asset di deploy
├─ scripts/             # Script utilitari
└─ DOCUMENTATION.md     # Questa documentazione
```

## Server API (`server/`)
### Variabili d'ambiente
- `PORT`: porta di ascolto del server (default `3000`).
- `DATA_ROOT`: cartella per la persistenza su file (default `./data`).
- `NODE_ENV`: `development` o `production`.
- `LDAP_URL`, `LDAP_BASE_DN`, `LDAP_DOMAIN`: configurazione LDAP.
- `DEV_ALLOWLIST`: lista utenti consentiti in sviluppo (CSV).

### Persistenza dati
I dati sono salvati su disco in `DATA_ROOT` con struttura:
```
DATA_ROOT/
├─ activity-types/
│  ├─ activity-types.json
│  └─ versions.json
├─ users/
│  └─ <userKey>/
│     ├─ profile.json
│     ├─ targets.json
│     ├─ months/
│     │  └─ <YYYY-MM>.json
│     ├─ daily/
│     │  └─ <YYYY-MM-DD>.summary.json
│     └─ alerts/
│        ├─ open.json
│        └─ history.json
└─ audit/
   └─ audit.jsonl
```

### Identità utente
La funzione condivisa `computeUserKey` (`shared/index.ts`) genera un identificatore hash stabile:
- `upn` → `upn:<lowercase>`
- `sid` → `sid:<original>`

### Endpoint principali
- `POST /api/v1/auth/login`
  - Input: `{ username, password }`
  - Output: `{ token, expiresAt, user, userKey }`
  - In sviluppo: verifica `DEV_ALLOWLIST` se LDAP non configurato.

- `POST /api/v1/activities`
  - Input: `{ date, start, end, activityTypeId, activityLabel?, notes?, clientRequestId?, idempotencyKey? }`
  - Validazioni:
    - Tempo in formato `HH:MM`.
    - Quarti d'ora (00, 15, 30, 45).
    - Nessuna sovrapposizione con attività esistenti.
    - Massimo 960 minuti al giorno.
  - Output: `{ activity, summary }`

- `GET /api/v1/days/:date`
  - Output: summary giornaliero con totali e attività.

- `GET /api/v1/activity-types`
  - Restituisce l'elenco dei tipi di attività con ETag.

- `PUT /api/v1/activity-types`
  - Aggiorna i tipi di attività (richiede autenticazione).

- `GET /api/v1/dashboard/status`
  - Query: `date`, `status`, `userKey`.
  - Output: elenco sintetico per dashboard.

### Tipi di attività esenti
Le etichette `Ferie`, `Malattia`, `Festività`, `Permesso` sono considerate esenti e impattano sul target giornaliero.

### Audit
Il server salva eventi sensibili in `audit/audit.jsonl`, includendo:
- request id
- timestamp
- userKey
- route/method
- hash del payload

## Dashboard (`dashboard/`)
### Funzionalità
- **Login**: autenticazione con cookie `token` (HttpOnly).
- **Status**: vista riepilogativa per data.
- **Activity types**: gestione tipi attività.
- **Export**: esportazione Excel in modalità week/month.

### Variabili d'ambiente
- `DASHBOARD_PORT`: porta di ascolto (default `4000`).
- `SERVER_URL`: base URL del server API (default `http://localhost:3000`).

## Shared (`shared/`)
- `computeUserKey`: normalizza e hash l'identità utente.

## Flusso di utilizzo
1. L'utente effettua login dalla dashboard (oppure via API).
2. Il server emette un token con scadenza (8 ore).
3. Le attività vengono inserite e salvate in JSON mensili.
4. Il server calcola summary giornalieri, avvisi e audit.

## Sicurezza e limiti
- Rate limiting globale (120 req/minuto, per IP o userKey).
- Token in-memory: si invalidano al riavvio del server.
- Lock file per evitare scritture concorrenti su dati utente.

## Troubleshooting
- **401 Unauthorized**: token mancante o scaduto.
- **INVALID_TIME**: formato orario errato o non in quarti d'ora.
- **OVERLAP**: attività sovrapposta a intervalli esistenti.
- **DAY_LIMIT**: oltre 960 minuti per giorno.
- **Avvisi npm deprecated**: provengono da dipendenze transitive. In ambienti con accesso al registry, valutare l'aggiornamento delle librerie che introducono `rimraf`, `glob` o `inflight` deprecati.

## Migliorie consigliate
- Persistenza token su storage condiviso.
- Validazione estesa su `date` e coerenza dei target.
- Logging strutturato centralizzato.
