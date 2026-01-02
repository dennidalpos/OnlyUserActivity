# Architettura Sistema Activity Tracker

## Overview

Sistema enterprise per tracciamento attività giornaliere con:
- Autenticazione LDAP/Active Directory
- API RESTful con JWT
- Dashboard admin web
- Persistenza filesystem JSON
- Audit logging completo

## Stack Tecnologico

- **Runtime:** Node.js 18+
- **Framework:** Express.js 5
- **Autenticazione:** LDAP (ldapjs) + JWT (jsonwebtoken)
- **Validazione:** Joi
- **Logging:** Pino
- **Template Engine:** EJS
- **Security:** Helmet, CORS, bcrypt
- **Session:** express-session (admin)
- **File Locking:** proper-lockfile

## Architettura Applicazione

```
┌─────────────────────────────────────────────────────┐
│              CLIENT APPLICATIONS                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ API Clients  │  │ Web Browser  │                │
│  │ (Mobile/Web) │  │ (Admin)      │                │
│  └──────┬───────┘  └──────┬───────┘                │
└─────────┼──────────────────┼──────────────────────┘
          │                  │
          │ HTTP(S)          │ HTTP(S)
          │                  │
┌─────────▼──────────────────▼──────────────────────┐
│         REVERSE PROXY (nginx/Apache)              │
│                   HTTPS/TLS                        │
└─────────┬──────────────────┬──────────────────────┘
          │                  │
┌─────────▼──────────────────▼──────────────────────┐
│              EXPRESS APPLICATION                   │
│  ┌──────────────────────────────────────────────┐ │
│  │           Middlewares Layer                  │ │
│  │  • Helmet (Security)                         │ │
│  │  • CORS                                      │ │
│  │  • Rate Limiting                             │ │
│  │  • Request Logger                            │ │
│  │  • Auth (JWT / Session)                      │ │
│  │  • Validation (Joi)                          │ │
│  │  • Error Handler                             │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────┬──────────────────────────┐  │
│  │   API Router     │   Admin Router           │  │
│  │   /api/*         │   /admin/*               │  │
│  └──────┬───────────┴──────┬───────────────────┘  │
│         │                  │                       │
│  ┌──────▼──────────────────▼──────────────────┐   │
│  │         Business Logic Layer               │   │
│  │  ┌────────────────┬────────────────────┐   │   │
│  │  │ Activity       │ Monitoring         │   │   │
│  │  │ Service        │ Service            │   │   │
│  │  ├────────────────┼────────────────────┤   │   │
│  │  │ LDAP Auth      │ Export             │   │   │
│  │  │ Service        │ Service            │   │   │
│  │  ├────────────────┼────────────────────┤   │   │
│  │  │ Token          │ Admin Auth         │   │   │
│  │  │ Service        │ Service            │   │   │
│  │  └────────────────┴────────────────────┘   │   │
│  └───────────────────┬────────────────────────┘   │
│                      │                            │
│  ┌───────────────────▼────────────────────────┐   │
│  │         Storage Layer                      │   │
│  │  • User Storage                            │   │
│  │  • Activity Storage                        │   │
│  │  • Audit Logger                            │   │
│  │  • File Storage (base)                     │   │
│  │  • Lock Manager                            │   │
│  └───────────────────┬────────────────────────┘   │
└────────────────────┼──────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────┐
│            EXTERNAL SYSTEMS                       │
│  ┌──────────────┬────────────────────────────┐   │
│  │ LDAP/AD      │ Filesystem                 │   │
│  │ Server       │ data/                      │   │
│  │              │ ├── users/                 │   │
│  │              │ ├── activities/            │   │
│  │              │ ├── audit/                 │   │
│  │              │ └── admin/                 │   │
│  └──────────────┴────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

## Struttura Moduli

### 1. Configuration (`src/config/`)
- `index.js` - Centralizza configurazione da env vars
- Validazione configurazione critica
- Export configurazione tipizzata

### 2. Middlewares (`src/middlewares/`)
- `auth.js` - JWT validation per API
- `adminAuth.js` - Session validation per admin
- `errorHandler.js` - Gestione errori centralizzata
- `rateLimiter.js` - Rate limiting globale e login
- `requestLogger.js` - Logging richieste con correlationId
- `validation.js` - Schema validation con Joi

### 3. Services

#### LDAP (`src/services/ldap/`)
- `ldapClient.js` - Client base LDAP (connessione, bind, search)
- `ldapAuth.js` - Autenticazione e verifica membership gruppi

#### Auth (`src/services/auth/`)
- `tokenService.js` - Generazione e validazione JWT
- `adminAuthService.js` - Autenticazione admin locale con bcrypt

#### Storage (`src/services/storage/`)
- `fileStorage.js` - Operazioni base filesystem (read/write JSON, locking)
- `userStorage.js` - CRUD utenti
- `activityStorage.js` - CRUD attività con organizzazione mensile
- `auditLogger.js` - Logging append-only con hash payload
- `lockManager.js` - File locking per concorrenza

#### Activity (`src/services/activity/`)
- `activityService.js` - Business logic attività
- `validationRules.js` - Regole validazione (overlap, continuità, summary)

#### Admin (`src/services/admin/`)
- `monitoringService.js` - Aggregazione dati per dashboard
- `exportService.js` - Export JSON/CSV

#### Utils (`src/services/utils/`)
- `timeUtils.js` - Validazione/conversione orari
- `dateUtils.js` - Gestione date e timezone
- `hashUtils.js` - SHA-256 hashing payload per audit

### 4. Routes

#### API (`src/routes/api/`)
- `auth.js` - POST /api/auth/login
- `activities.js` - CRUD /api/activities

#### Admin (`src/routes/admin/`)
- `auth.js` - Login/logout admin
- `dashboard.js` - Dashboard e monitoring

### 5. Views (`src/views/`)
- Template EJS per admin dashboard
- Layout base, login, dashboard, export, error pages

## Flussi Principali

### Login Utente LDAP

```
1. Client → POST /api/auth/login { username, password }
2. Rate Limiter (5 tentativi / 15 min)
3. Schema Validation (Joi)
4. LDAP Client Connect
5. LDAP Bind (service account o anonimo)
6. LDAP Search user
7. Verifica membership gruppo "Domain Users"
8. LDAP Bind con credenziali utente
9. Crea/Aggiorna profilo utente locale
10. Genera JWT token (exp: 8h)
11. Audit Log "LOGIN"
12. Response { token, userKey, displayName, expiresAt }
```

### Creazione Attività

```
1. Client → POST /api/activities + Bearer token
2. JWT Validation → Extract userKey
3. Schema Validation (date, times, type)
4. Business Rules:
   - Validate time step (15 min)
   - Check overlap con attività esistenti
   - Check continuità (se STRICT_CONTINUITY=true)
   - Validate activityType
5. File Lock acquisition
6. Read month file (activities/{userKey}/{YYYY}/{MM}.json)
7. Append nuova attività
8. Atomic write (temp + rename)
9. Release lock
10. Audit Log "CREATE_ACTIVITY"
11. Response { activity }
```

### Dashboard Admin

```
1. Admin → GET /admin/dashboard?date=YYYY-MM-DD
2. Session validation
3. Load all users
4. For each user:
   - Load activities for date
   - Calculate summary (total minutes, completion %)
   - Determine status (OK/INCOMPLETO/ASSENTE)
5. Apply filters (username, status)
6. Aggregate summary counts
7. Render EJS template
```

## Persistenza Dati

### Struttura Filesystem

```
data/
├── users/
│   ├── {userKey}.json          # Profilo utente
│   └── index.json               # username → userKey mapping
├── activities/
│   └── {userKey}/
│       └── {YYYY}/
│           └── {MM}.json        # Attività mensili
├── audit/
│   └── {YYYY}/
│       └── {MM}/
│           └── {DD}.jsonl       # Audit log giornaliero (append-only)
├── admin/
│   └── credentials.json         # Password hash admin
└── locks/
    └── *.lock                   # Lock file temporanei
```

### Schema User

```json
{
  "userKey": "uuid",
  "username": "mario.rossi",
  "displayName": "Mario Rossi",
  "email": "mario.rossi@company.local",
  "department": "IT",
  "createdAt": "ISO8601",
  "lastLoginAt": "ISO8601",
  "metadata": {
    "ldapDN": "CN=..."
  }
}
```

### Schema Activity (in month file)

```json
{
  "userKey": "uuid",
  "year": 2026,
  "month": 1,
  "activities": [
    {
      "id": "uuid",
      "date": "2026-01-02",
      "startTime": "09:00",
      "endTime": "11:00",
      "activityType": "lavoro",
      "customType": null,
      "notes": "...",
      "durationMinutes": 120,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "updatedAt": "ISO8601"
}
```

### Schema Audit Log

```jsonl
{"timestamp":"ISO8601","requestId":"uuid","userKey":"uuid","username":"mario.rossi","action":"LOGIN","ip":"192.168.1.1","payloadHash":"sha256:...","payload":{...}}
{"timestamp":"ISO8601","requestId":"uuid","userKey":"uuid","username":"mario.rossi","action":"CREATE_ACTIVITY","ip":"192.168.1.1","payloadHash":"sha256:...","payload":{...}}
```

## Sicurezza

### Autenticazione
- **Utenti:** LDAP/AD + JWT (stateless)
- **Admin:** Local bcrypt + Session (stateful)

### Autorizzazione
- **API:** JWT middleware verifica userKey
- **Admin:** Session middleware
- **Scoping dati:** Utente vede solo proprie attività

### Rate Limiting
- Globale: 100 req / 15 min per IP
- Login: 5 tentativi / 15 min per IP

### Input Validation
- Schema validation (Joi)
- Sanitizzazione automatica
- Regex strict per date/time

### Headers Security (Helmet)
- CSP, HSTS, XSS protection
- X-Frame-Options, etc.

### Audit Logging
- Ogni operazione sensibile loggata
- Payload hash (SHA-256) per integrità
- Append-only (immutabile)

## Concorrenza

### File Locking
- Lock esclusivo per scritture (proper-lockfile)
- Retry automatico (5 tentativi, timeout 1s)
- Stale lock detection (10s)

### Scrittura Atomica
1. Write to `{file}.tmp`
2. Rename to `{file}` (atomic operation)
3. Backup precedente in `{file}.bak`

## Scalabilità

### Limitazioni Attuali
- **Storage:** Filesystem locale (single-node)
- **Concorrenza:** File locking (bottleneck su write)
- **Query:** No indexing avanzato

### Ottimizzazioni Possibili
1. **Caching:** Redis per session e dati hot
2. **Database:** Migrate a PostgreSQL/MongoDB
3. **Clustering:** PM2 cluster mode (read-only ops)
4. **Storage remoto:** NFS/S3 per data/
5. **Search:** Elasticsearch per query complesse

### Capacità Stimata
- **Utenti:** ~500 (con filesystem)
- **Attività/giorno:** ~5000 (10 attività × 500 utenti)
- **Latency API:** <100ms (read), <500ms (write con lock)
- **Storage:** ~10MB/anno per 100 utenti

## Monitoring e Observability

### Logs
- **Application:** Pino (structured JSON)
- **Audit:** JSONL append-only
- **PM2:** stdout/stderr in logs/

### Metriche (da implementare)
- Request rate, latency (p50, p95, p99)
- Error rate per endpoint
- Authentication success/failure rate
- Disk usage growth

### Alerts (raccomandati)
- Disk space < 10%
- Error rate > 5%
- LDAP connection failures
- Lock timeout frequency

## Testing Strategy

### Unit Tests
- Services business logic
- Validation rules
- Utils (time, date, hash)

### Integration Tests
- API endpoints (supertest)
- LDAP mock
- Filesystem mock

### E2E Tests (manuale)
- User workflow completo
- Admin dashboard
- Export funzionalità

## Deployment

### Ambienti

1. **Development**
   - `npm run dev` (nodemon)
   - LDAP mock opzionale

2. **Production**
   - PM2 cluster mode
   - Reverse proxy HTTPS (nginx)
   - Monitoring attivo

### CI/CD (da implementare)
- Lint (eslint)
- Unit tests
- Build check
- Deploy automation

## Roadmap Evolutiva

### v2.0 (Priorità Alta)
- [ ] Refresh token JWT
- [ ] Password change forzato admin
- [ ] Calendario festività automatico
- [ ] Notifiche email giornata incompleta

### v3.0 (Priorità Media)
- [ ] Export PDF con grafici
- [ ] API metrics (Prometheus)
- [ ] Multi-language (i18n)
- [ ] Mobile app

### v4.0 (Priorità Bassa)
- [ ] Database migration (PostgreSQL)
- [ ] Multi-tenancy
- [ ] SSO (SAML/OAuth2)
- [ ] ML suggestions basate su storico

## Conclusioni

Sistema robusto e production-ready per gestione attività aziendali con:
- Architettura modulare e manutenibile
- Security best practices
- Persistenza affidabile
- Documentazione completa
- Pronto per deploy enterprise
