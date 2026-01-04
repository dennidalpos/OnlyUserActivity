# Activity Tracker - Sistema di Tracciamento Attività

**Versione:** 1.3.0 | **Stato:** Production Ready

Sistema enterprise per tracciamento e monitoraggio attività giornaliere degli utenti con autenticazione flessibile (locale o LDAP/AD), interfacce web complete e API RESTful.

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

### Dashboard Admin Avanzata
- ✅ **Navigazione temporale** - Giorno, Settimana, Mese con pulsanti avanti/indietro
- ✅ **Visualizzazione compatta** - Statistiche aggregate e dettagli utenti
- ✅ **Export completo** - Excel (XLSX), CSV, JSON con range flessibili
- ✅ **Selezione intelligente** - Tutti gli utenti o selezione multipla con checkbox
- ✅ **Range rapidi export** - Oggi, Ieri, Settimana, Mese, Anno, Tutti i dati
- ✅ **Riavvio server da web** - Riavvia il server direttamente dall'interfaccia admin
- ✅ **Data minima visualizzata** - Mostra da quando sono disponibili i dati

### Dashboard Utente
- ✅ **Gestione attività** - Creazione, modifica, eliminazione con calendario
- ✅ **Time picker intelligente** - Step 15 minuti, validazione orari
- ✅ **Statistiche real-time** - Ore lavorate, completamento, straordinari
- ✅ **Sistema help integrato** - Guida contestuale

### Autenticazione e Sicurezza
- ✅ **Autenticazione flessibile** - Locale (bcrypt) o LDAP/AD
- ✅ **Tracking automatico** - Utenti tracciati al primo accesso
- ✅ **JWT authentication** - Token sicuri per API
- ✅ **Rate limiting** - Protezione contro bruteforce
- ✅ **Audit log** - Tracciamento immutabile con SHA-256
- ✅ **Cache performance** - Cache in memoria con TTL 5 minuti

### Export Dati Avanzato
- ✅ **Export Excel (XLSX)**
  - Foglio "Dettaglio Attività" con tutte le attività
  - Foglio "Riepilogo Utenti" con statistiche aggregate
  - Formattazione con colori e autofilter
- ✅ **Export CSV** - Compatibile Excel
- ✅ **Export JSON** - Per integrazioni API
- ✅ **Tipi export**
  - Dettagliato: tutte le attività con orari
  - Riepilogo: totali per utente
- ✅ **Selezione utenti**
  - Tutti gli utenti
  - Selezione multipla specifica
- ✅ **Range temporali**
  - Oggi / Ieri
  - Questa settimana / Settimana scorsa
  - Questo mese / Mese scorso
  - Quest'anno
  - Tutti i dati disponibili
  - Personalizzato (data inizio/fine)

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

## 👥 Gestione Utenti

### Modalità Locale (Default)

**Da riga di comando:**
```bash
node scripts/create-user.js
# Inserisci: username, password, nome completo, email
```

**Da web UI (Dashboard Admin):**
1. Login admin: `http://localhost:3000/admin`
2. Vai su "Configurazione" → "Gestione Utenti Locali"
3. Clicca "+ Nuovo Utente Locale"
4. Compila form e clicca "Crea Utente"

### Modalità LDAP

Con `LDAP_ENABLED=true`, gli utenti vengono autenticati contro LDAP/AD.
**Al primo login**, l'utente viene automaticamente creato e tracciato nel sistema.

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

#### Export Dati
- **Indicatore data minima** - Visualizza da quando sono disponibili i dati
- **Range rapidi:** Oggi, Ieri, Settimana, Mese, Anno, Tutti i dati
- **Selezione utenti intelligente:**
  - Checkbox "Tutti gli utenti (N)"
  - Selezione multipla con stato indeterminato
  - Lista scrollabile con filtro
- **Formati:**
  - Excel (XLSX) - 2 fogli (Dettaglio + Riepilogo)
  - CSV - Compatibile Excel
  - JSON - Per API
- **Tipi:**
  - Dettagliato - Tutte le attività con orari
  - Riepilogo - Totali per utente

#### Configurazione
- **Gestione Server**
  - **Riavvio server** - Pulsante riavvio diretto da web UI
  - Info server (Node.js version, uptime, memoria)
- **LDAP/Active Directory** - Configurazione completa
- **HTTPS** - Certificati e porta HTTPS
- **Server** - Porta, host, timeout
- **Tipi attività** - Categorie personalizzabili
- **Utenti locali** - Crea/elimina utenti

### API REST
**Base URL:** `http://localhost:3000/api`

Endpoints principali:
- `POST /api/auth/login` - Autenticazione
- `GET /api/activities/:date` - Attività giornaliere
- `POST /api/activities` - Crea attività
- `PUT /api/activities/:id` - Modifica attività
- `DELETE /api/activities/:id` - Elimina attività
- `GET /api/activities/types` - Tipi attività

**Autenticazione:** Header `Authorization: Bearer {jwt_token}`

**Esempio:**
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
    "date": "2026-01-04",
    "startTime": "09:00",
    "endTime": "17:00",
    "activityType": "lavoro",
    "notes": "Giornata completa"
  }'
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
│   │   ├── activity/       # Business logic
│   │   ├── admin/          # Export, monitoring, server
│   │   └── utils/          # Date, time, hash
│   ├── views/              # Template EJS
│   ├── app.js
│   └── server.js
├── public/
│   ├── css/               # Stili uniformati
│   └── js/                # JavaScript client
├── data/                  # Dati applicazione
├── scripts/               # Helper scripts
│   ├── create-user.js
│   └── restart-server.js  # Script riavvio automatico
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
- **Invalidazione automatica** - Alla modifica dati

### Ottimizzazioni
- Log console solo per errori (status >= 400)
- Richieste parallele dove possibile
- Lazy loading componenti dashboard

## 🔄 Changelog

### v1.3.0 (2026-01-04)
**Dashboard Admin:**
- Navigazione temporale (Giorno/Settimana/Mese)
- Visualizzazione compatta con statistiche aggregate
- Pulsanti avanti/indietro per navigazione rapida

**Export Avanzato:**
- Export Excel (XLSX) con fogli formattati
- Range rapidi (Oggi, Settimana, Mese, Anno, Tutti)
- Selezione utenti unificata con checkbox intelligente
- Indicatore data minima disponibile
- Export riepilogo e dettagliato

**Configurazione:**
- Riavvio server da web UI
- Gestione completa server dalla dashboard

**Performance:**
- Cache in memoria (TTL 5 minuti)
- Log ottimizzati (solo errori)
- Riduzione I/O disco 90%

**UI/UX:**
- Stili uniformati su tutti i pulsanti
- Nessuna sottolineatura al click
- Colori consistenti
- Transizioni smooth

### v1.2.0 (2026-01-04)
- Time picker step 15 minuti
- Sistema help integrato
- Badge tipo autenticazione
- Tracking automatico utenti

### v1.1.0 (2026-01-03)
- Dashboard utente completa
- Autenticazione locale default
- LDAP opzionale

### v1.0.0 (2026-01-02)
- Release iniziale
- API RESTful
- Dashboard admin base

## 🤝 Contribuire

1. Fork il repository
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## 📝 Licenza

ISC License

## 🆘 Supporto

- **Issues:** https://github.com/dennidalpos/OnlyUserActivity/issues

---

**Sistema completo e production-ready per gestione attività aziendali**
