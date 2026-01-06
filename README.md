# Activity Tracker - Sistema di Tracciamento Attività

**Versione:** 2.0.0 | **Stato:** Production Ready

Sistema enterprise per tracciamento e monitoraggio attività giornaliere degli utenti con autenticazione flessibile (locale o LDAP/AD), gestione turni configurabile, interfacce web complete e API RESTful.

## 🚀 Quick Start

```bash
# 1. Installa
git clone https://github.com/dennidalpos/OnlyUserActivity.git
cd OnlyUserActivity
npm install

# 2. Configura (opzionale, funziona out-of-the-box)
cp .env.example .env

# 3. Crea primo utente locale
node scripts/create-user.js

# 4. Avvia
npm start

# 5. Accedi
# Utente: http://localhost:3000 (credenziali create)
# Admin:  http://localhost:3000/admin (admin/admin)
```

## ✨ Caratteristiche Principali

### 🔄 Gestione Turni Configurabile (NUOVO v2.0)
- ✅ **Configurazione turni da web** - Crea, modifica ed elimina tipi di turno personalizzati
- ✅ **Opzioni flessibili** - Include weekend (sab/dom), include festività
- ✅ **Turni illimitati** - Nessun limite al numero di turni configurabili
- ✅ **Assegnazione dinamica** - Dropdown automaticamente popolato con turni configurati
- ✅ **Turni default** - 24/7 e Feriali preconfigurati

### 👥 Gestione Utenti Avanzata
- ✅ **Utenti locali** - Gestione completa con reparto, email, turno
- ✅ **Utenti LDAP/AD** - Sincronizzazione automatica reparto/email da Active Directory
- ✅ **Assegnazione turni** - Menu a tendina con turni configurabili
- ✅ **Pulsante Imposta** - Salvataggio simultaneo di reparto, email e turno

### 📊 Dashboard Admin Avanzata
- ✅ **Navigazione temporale** - Giorno, Settimana, Mese con pulsanti avanti/indietro
- ✅ **Visualizzazione compatta** - Statistiche aggregate e dettagli utenti
- ✅ **Export completo** - Excel (XLSX), CSV, JSON con range flessibili
- ✅ **Selezione intelligente** - Tutti gli utenti o selezione multipla con checkbox
- ✅ **Range rapidi export** - Oggi, Ieri, Settimana, Mese, Anno, Tutti i dati
- ✅ **Riavvio server da web** - Riavvia il server direttamente dall'interfaccia admin

### 🖥️ Dashboard Utente
- ✅ **Gestione attività** - Creazione, modifica, eliminazione con calendario
- ✅ **Time picker intelligente** - Step 15 minuti, validazione orari
- ✅ **Statistiche real-time** - Ore lavorate, completamento, straordinari
- ✅ **Sistema help integrato** - Guida contestuale

### 🔐 Autenticazione e Sicurezza
- ✅ **Autenticazione flessibile** - Locale (bcrypt) o LDAP/AD
- ✅ **Tracking automatico** - Utenti tracciati al primo accesso
- ✅ **JWT authentication** - Token sicuri per API
- ✅ **Rate limiting** - Protezione contro bruteforce
- ✅ **Audit log** - Tracciamento immutabile con SHA-256
- ✅ **Cache performance** - Cache in memoria con TTL 5 minuti

## 📋 Prerequisiti

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Permessi filesystem** - Directory `data/` scrivibile

**Opzionali:**
- Server LDAP/AD (solo se abiliti LDAP_ENABLED=true)
- Reverse proxy HTTPS (nginx/Apache - raccomandato per produzione)

## 📦 Installazione

```bash
git clone https://github.com/dennidalpos/OnlyUserActivity.git
cd OnlyUserActivity
npm install
```

## ⚙️ Configurazione

### Configurazione Minima (Autenticazione Locale)

Il sistema funziona **senza configurazione** con i default. Per personalizzare:

```bash
cp .env.example .env
```

**Configurazioni essenziali per produzione:**

```env
NODE_ENV=production
SERVER_PORT=3000

# IMPORTANTE: Cambia questi secret in produzione!
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ADMIN_SESSION_SECRET=your-admin-session-secret-min-32-chars

# LDAP opzionale (default: false)
LDAP_ENABLED=false

# HTTPS opzionale (default: false, usa reverse proxy)
HTTPS_ENABLED=false
```

### Generazione Secret Sicuri

```bash
# Genera JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Genera ADMIN_SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Configurazione LDAP (Opzionale)

```env
LDAP_ENABLED=true
LDAP_URL=ldaps://dc.company.local:636
LDAP_BASE_DN=DC=company,DC=local
LDAP_BIND_DN=CN=ServiceAccount,CN=Users,DC=company,DC=local
LDAP_BIND_PASSWORD=service_account_password
LDAP_USER_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_REQUIRED_GROUP=CN=Domain Users,CN=Users,DC=company,DC=local
```

### Configurazione Avanzata da UI (NUOVO)

L'admin può modificare **tutti i parametri server** direttamente dall'interfaccia web, senza intervenire manualmente sul file `.env`.

1. Accedi alla dashboard admin: `http://localhost:3000/admin`
2. Vai su **Configurazione** → **Impostazioni Avanzate**
3. Modifica i parametri desiderati
4. Salva e **riavvia** il server per applicare le modifiche

#### Parametri disponibili nell'interfaccia avanzata

**Server (Configurazione Server)**
- `SERVER_HOST` (Host)
- `SERVER_PORT` (Porta)
- `TRUST_PROXY` (Proxy level)

**HTTPS (Configurazione HTTPS)**
- `HTTPS_ENABLED`
- `HTTPS_CERT_PATH`
- `HTTPS_KEY_PATH`

**Logging (sezione dedicata)**
- `LOG_LEVEL`
- `LOG_TO_FILE`
- `LOG_FILE_PATH`

**LDAP / Active Directory (sezione dedicata)**
- `LDAP_ENABLED`
- `LDAP_URL`
- `LDAP_BASE_DN`
- `LDAP_BIND_DN`
- `LDAP_BIND_PASSWORD`
- `LDAP_USER_SEARCH_FILTER`
- `LDAP_GROUP_SEARCH_BASE`
- `LDAP_REQUIRED_GROUP`
- `LDAP_TIMEOUT`

**JWT**
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_ENABLED`

**Storage**
- `DATA_ROOT_PATH`
- `AUDIT_LOG_RETENTION_DAYS`
- `AUDIT_PAYLOAD_MODE`

**Admin**
- `ADMIN_SESSION_SECRET`
- `ADMIN_SESSION_MAX_AGE`
- `ADMIN_DEFAULT_USERNAME`
- `ADMIN_DEFAULT_PASSWORD`

**Sicurezza**
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `LOGIN_RATE_LIMIT_MAX`
- `LOGIN_LOCKOUT_DURATION_MS`
- `CORS_ORIGIN`

**Attività**
- `ACTIVITY_STRICT_CONTINUITY`
- `ACTIVITY_REQUIRED_MINUTES`

#### Percorsi certificati precompilati

I campi **Percorso Certificato** e **Percorso Chiave Privata** vengono precompilati
con il path derivato dalla root del progetto (es: `<root>/certs/cert.pem` e `<root>/certs/key.pem`).
Su Windows Server 2022 usa percorsi assoluti quando i file si trovano fuori dal progetto.

#### Test di troubleshooting prima del salvataggio

La sezione **Test di Troubleshooting** consente di verificare parametri critici prima di applicare modifiche:
- **Test permessi storage**: verifica che la directory dati sia scrivibile.
- **Verifica file HTTPS**: controlla accessibilità certificato/chiave configurati in "Configurazione HTTPS".

#### Test Bind LDAP

Prima di salvare impostazioni LDAP attive, esegui **Test Bind LDAP**:
- Verifica connettività e credenziali Bind DN.
- Riduce errori di configurazione prima del riavvio.

#### Logging locale su Windows Server 2022

La UI avanzata consente di scrivere i log su file locale:
- **LOG_TO_FILE** abilita la scrittura su file.
- **LOG_FILE_PATH** definisce il percorso assoluto sul server Windows (es: `C:\\OnlyUserActivity\\logs\\activity-tracker.log`).
Le icone di aiuto (ⓘ) nell'interfaccia mostrano una descrizione rapida di ogni parametro.

## 👥 Gestione Utenti

### Modalità Locale (Default)

**Da riga di comando:**
```bash
node scripts/create-user.js
# Inserisci: username, password, nome completo, email, reparto
```

**Da web UI (Dashboard Admin):**
1. Login admin: `http://localhost:3000/admin`
2. Vai su "Configurazione" → "Gestione Utenti Locali"
3. Clicca "+ Nuovo Utente Locale"
4. Compila form (username, password, nome, email, reparto)
5. Clicca "Crea Utente"
6. Seleziona turno dal dropdown e clicca "Imposta"

### Modalità LDAP

Con `LDAP_ENABLED=true`, gli utenti vengono autenticati contro LDAP/AD.
**Al primo login**, l'utente viene automaticamente creato con:
- Reparto ed email sincronizzati da Active Directory
- Possibilità di assegnare un turno dall'interfaccia admin

## 🔄 Gestione Turni

### Configurazione Tipi di Turno

1. Login admin: `http://localhost:3000/admin`
2. Vai su "Turni" nel menu principale
3. Clicca "+ Aggiungi Nuovo Turno"
4. Compila:
   - **ID Turno**: identificatore univoco (es: `turno-mattina`)
   - **Nome Turno**: nome visualizzato (es: "Turno Mattina")
   - **Descrizione**: descrizione opzionale
   - **Includi Weekend**: checkbox per sabato/domenica
   - **Includi Festività**: checkbox per giorni festivi
5. Salva

### Turni Preconfigurati

Il sistema include 2 turni di default:
- **24/7**: 24 ore su 24, 7 giorni su 7 (weekend ✅, festività ✅)
- **Feriali**: Solo giorni feriali (weekend ❌, festività ❌)

### Assegnazione Turni agli Utenti

1. Vai su "Configurazione" → "Gestione Utenti Locali"
2. Per ogni utente, seleziona il turno dal dropdown
3. Clicca "Imposta" per salvare
4. Il turno viene salvato insieme a reparto ed email

## 🚀 Avvio

### Sviluppo

```bash
npm run dev  # Con nodemon (auto-reload)
```

### Produzione

```bash
# Avvio semplice
npm start

# Con PM2 (raccomandato)
npm install -g pm2
pm2 start src/server.js --name activity-tracker
pm2 save
pm2 startup  # Auto-start al boot
```

Server disponibile su `http://localhost:3000`

## 🖥️ Interfacce

### Dashboard Utente
**URL:** `http://localhost:3000/user/auth/login`

Funzionalità:
- Login con credenziali locali o LDAP
- Calendario con selezione data
- Gestione completa attività (crea, modifica, elimina)
- Statistiche giornaliere (ore, completamento, straordinari)
- Time picker step 15 minuti
- Sistema help integrato

### Dashboard Admin
**URL:** `http://localhost:3000/admin/auth/login`

Credenziali default: `admin` / `admin` (**CAMBIALE!**)

#### Menu Principale
- **Dashboard** - Monitoraggio attività
- **Export** - Esportazione dati
- **Turni** - Configurazione tipi di turno (NUOVO)
- **Configurazione** - Impostazioni server e utenti
- **Logout**

#### Monitoraggio (Dashboard)
- **Tre modalità visualizzazione:**
  - Giorno - Mostra attività giornaliere
  - Settimana - Statistiche settimanali (lun-dom)
  - Mese - Riepilogo mensile
- **Navigazione:** Pulsanti Precedente/Oggi/Successivo
- **Statistiche:**
  - Totale utenti, OK, Incompleti, Assenti
  - Ore totali periodo (settimana/mese)
  - Media ore per utente
- **Filtri:** Username, Stato completamento
- **Visualizzazione compatta** con tabella ottimizzata

#### Turni (NUOVO)
- **Lista tipi di turno** - Card con nome, ID, descrizione
- **Opzioni visualizzate** - Weekend (✅/❌), Festività (✅/❌)
- **Aggiungi turno** - Modal con form completo
- **Modifica turno** - Modifica nome, descrizione, opzioni
- **Elimina turno** - Rimozione con conferma
- **Validazione ID** - Solo lowercase, numeri, trattini

#### Export Dati
- **Indicatore data minima** - Visualizza da quando sono disponibili i dati
- **Range rapidi:** Oggi, Ieri, Settimana, Mese, Anno, Tutti i dati
- **Selezione utenti intelligente:**
  - Checkbox "Tutti gli utenti (N)"
  - Selezione multipla con stato indeterminato
- **Formati:**
  - Excel (XLSX) - 2 fogli (Dettaglio + Riepilogo)
  - CSV - Compatibile Excel
  - JSON - Per API
- **Tipi:**
  - Dettagliato - Tutte le attività con orari
  - Riepilogo - Totali per utente

#### Configurazione
- **Gestione Server**
  - Riavvio server da web UI
  - Info server (Node.js version, uptime, memoria)
- **LDAP/Active Directory** - Configurazione completa
- **HTTPS** - Certificati e porta HTTPS
- **Server** - Porta, host, timeout
- **Tipi attività** - Categorie personalizzabili
- **Utenti locali** - Crea/elimina utenti, gestisci reparto/email/turno
- **Impostazioni avanzate** - Tutti i parametri server in UI con troubleshooting e test LDAP

### API REST
**Base URL:** `http://localhost:3000/api`

#### Endpoints Principali

**Autenticazione:**
- `POST /api/auth/login` - Login utente
  ```json
  {
    "username": "mario",
    "password": "Pass123!"
  }
  ```

**Attività:**
- `GET /api/activities/:date` - Attività giornaliere
- `GET /api/activities/range?from=YYYY-MM-DD&to=YYYY-MM-DD` - Range attività
- `POST /api/activities` - Crea attività
- `PUT /api/activities/:id` - Modifica attività
- `DELETE /api/activities/:id` - Elimina attività
- `GET /api/activities/types` - Tipi attività disponibili

**Admin:**
- `GET /admin/api/users` - Lista utenti
- `POST /admin/api/users` - Crea utente locale
- `PUT /admin/api/users/:userKey` - Aggiorna utente (shift, department, email)
- `DELETE /admin/api/users/:userKey` - Elimina utente locale
- `GET /admin/api/shift-types` - Lista tipi di turno
- `POST /admin/api/shift-types` - Crea tipo di turno
- `PUT /admin/api/shift-types/:id` - Modifica tipo di turno
- `DELETE /admin/api/shift-types/:id` - Elimina tipo di turno

**Autenticazione:** Header `Authorization: Bearer {jwt_token}`

**Esempio Completo:**
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mario","password":"Pass123!"}' \
  | jq -r '.data.token')

# Crea attività
curl -X POST http://localhost:3000/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-06",
    "startTime": "09:00",
    "endTime": "17:00",
    "activityType": "lavoro",
    "notes": "Giornata completa"
  }'

# Get attività range
curl -X GET "http://localhost:3000/api/activities/range?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

## 📁 Struttura Progetto

```
OnlyUserActivity/
├── src/
│   ├── config/              # Configurazione centralizzata
│   ├── middlewares/         # Auth, validation, error handling
│   ├── routes/
│   │   ├── api/            # API REST endpoints
│   │   ├── admin/          # Dashboard admin routes
│   │   └── user/           # Dashboard utente routes
│   ├── services/
│   │   ├── auth/           # LDAP, locale, JWT
│   │   ├── storage/        # File storage con cache
│   │   ├── activity/       # Business logic attività
│   │   ├── admin/          # Export, monitoring, server, shift types
│   │   └── utils/          # Date, time, hash
│   ├── views/              # Template EJS
│   │   ├── admin/         # Dashboard admin (dashboard, export, shifts, settings)
│   │   ├── user/          # Dashboard utente
│   │   └── errors/        # Pagine errore
│   ├── app.js             # Express app setup
│   └── server.js          # Server HTTP/HTTPS
├── public/
│   ├── css/               # Stili uniformati
│   └── js/                # JavaScript client
├── data/                  # Dati applicazione (auto-generato)
│   ├── users/            # File utenti JSON
│   ├── activities/       # Attività per utente/mese
│   ├── audit/            # Log audit immutabili
│   ├── admin/            # Credenziali admin
│   └── shift-types.json  # Configurazione turni
├── scripts/               # Helper scripts
│   ├── create-user.js
│   └── restart-server.js
├── .env.example
├── package.json
└── README.md
```

## 🔒 Sicurezza

### Produzione Checklist

**Secrets:**
- [ ] Generato `JWT_SECRET` random (min 32 caratteri)
- [ ] Generato `ADMIN_SESSION_SECRET` random (min 32 caratteri)
- [ ] Cambiato password admin default

**Network:**
- [ ] Configurato reverse proxy HTTPS (nginx/Apache)
- [ ] Impostato `CORS_ORIGIN` al dominio reale
- [ ] Configurato firewall

**Storage:**
- [ ] Permessi directory `data/` impostati a 700
- [ ] Backup automatico configurato
- [ ] Log rotation attivo

**Environment:**
- [ ] `NODE_ENV=production`
- [ ] Rate limiting verificato
- [ ] Monitoring attivo

## 🧪 Funzionalità Performance

### Cache in Memoria
- **Cache utenti** - TTL 5 minuti
- **Cache index** - Riduce I/O disco ~90%
- **Cache shift types** - Configurazioni turni
- **Invalidazione automatica** - Alla modifica dati

### Ottimizzazioni
- Log console solo per errori (status >= 400)
- Richieste parallele dove possibile
- Lazy loading componenti dashboard

## 📝 Licenza

ISC License

## 🆘 Supporto

- **Issues:** https://github.com/dennidalpos/OnlyUserActivity/issues

---

**Sistema completo e production-ready per gestione attività aziendali con turni configurabili**
