# Activity Tracker - Sistema di Tracciamento Attività

Sistema completo per monitoraggio e inserimento attività giornaliere utenti aziendali con autenticazione LDAP/Active Directory.

## Caratteristiche

- ✅ **Autenticazione LDAP/AD** con verifica membership gruppi
- ✅ **API RESTful** per gestione attività con JWT authentication
- ✅ **Dashboard Admin** web per monitoraggio ed export
- ✅ **Persistenza su filesystem** (JSON) senza database
- ✅ **Audit logging** completo append-only
- ✅ **Validazioni business** (orari, sovrapposizioni, continuità)
- ✅ **Export dati** in JSON e CSV
- ✅ **Sicurezza** con rate limiting, helmet, CORS

## Prerequisiti

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Accesso LDAP/AD** - Server raggiungibile con credenziali (opzionale bind account)
- **Permessi filesystem** - Directory `data/` scrivibile dall'utente applicativo
- **Reverse Proxy (produzione)** - nginx o Apache con certificato TLS (raccomandato)

## Installazione

```bash
# Clone repository
git clone https://github.com/dennidalpos/OnlyUserActivity.git
cd OnlyUserActivity

# Installa dipendenze
npm install

# Copia e configura environment
cp .env.example .env
# Modifica .env con le tue configurazioni

# Crea directory logs (opzionale)
mkdir logs
```

## Configurazione

### File `.env`

Modifica il file `.env` con i parametri del tuo ambiente:

```bash
# Server
NODE_ENV=production
SERVER_HOST=0.0.0.0
SERVER_PORT=3000

# LDAP/Active Directory - CONFIGURAZIONE OBBLIGATORIA
LDAP_URL=ldap://dc.company.local:389
LDAP_BASE_DN=DC=company,DC=local
LDAP_BIND_DN=CN=svc-activity-tracker,OU=Service Accounts,DC=company,DC=local
LDAP_BIND_PASSWORD=YourSecurePassword
LDAP_USER_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_REQUIRED_GROUP=Domain Users

# JWT - CAMBIA IN PRODUZIONE
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Admin - CAMBIA PASSWORD DOPO PRIMO ACCESSO
ADMIN_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Storage
DATA_ROOT_PATH=./data

# Activity Rules
ACTIVITY_STRICT_CONTINUITY=false  # true per forzare continuità orari
ACTIVITY_REQUIRED_MINUTES=480     # 8 ore
```

### Generazione Secret

Per generare secret sicuri:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Avvio

### Sviluppo

```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

### Produzione

#### Opzione 1: Node diretto

```bash
npm start
```

#### Opzione 2: PM2 (raccomandato)

```bash
# Installa PM2 globalmente
npm install -g pm2

# Avvia applicazione
pm2 start ecosystem.config.js

# Salva configurazione
pm2 save

# Configura avvio automatico
pm2 startup
# Seguire le istruzioni visualizzate

# Gestione
pm2 status
pm2 logs activity-tracker
pm2 restart activity-tracker
pm2 stop activity-tracker
```

## Configurazione HTTPS

### Opzione 1: Reverse Proxy nginx (RACCOMANDATO)

Crea file `/etc/nginx/sites-available/activity-tracker`:

```nginx
server {
    listen 80;
    server_name activity.company.local;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name activity.company.local;

    ssl_certificate /etc/ssl/certs/activity.crt;
    ssl_certificate_key /etc/ssl/private/activity.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Abilita configurazione:

```bash
ln -s /etc/nginx/sites-available/activity-tracker /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Configura `.env`:

```bash
TRUST_PROXY=1
```

### Opzione 2: HTTPS Diretto (non raccomandato)

```bash
HTTPS_ENABLED=true
HTTPS_CERT_PATH=/path/to/cert.pem
HTTPS_KEY_PATH=/path/to/key.pem
```

## Accesso

- **API utenti:** `https://activity.company.local/api`
- **Dashboard admin:** `https://activity.company.local/admin`
- **Health check:** `https://activity.company.local/health`

### Credenziali Admin Default

- **Username:** `admin`
- **Password:** `admin`

⚠️ **IMPORTANTE:** Cambiare la password al primo accesso!

## Utilizzo API

### Autenticazione Utente

```bash
# Login
curl -X POST https://activity.company.local/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "mario.rossi",
    "password": "Password123!"
  }'

# Risposta
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userKey": "uuid",
    "username": "mario.rossi",
    "displayName": "Mario Rossi",
    "expiresAt": "2026-01-02T16:30:00.000Z"
  }
}
```

### Gestione Attività

```bash
# Ottieni attività del giorno
curl https://activity.company.local/api/activities/2026-01-02 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Crea nuova attività
curl -X POST https://activity.company.local/api/activities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-02",
    "startTime": "09:00",
    "endTime": "11:00",
    "activityType": "lavoro",
    "notes": "Sviluppo feature X"
  }'

# Aggiorna attività
curl -X PUT "https://activity.company.local/api/activities/ACTIVITY_ID?date=2026-01-02" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endTime": "12:00",
    "notes": "Sviluppo feature X - completato"
  }'

# Elimina attività
curl -X DELETE "https://activity.company.local/api/activities/ACTIVITY_ID?date=2026-01-02" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Lista attività in range
curl "https://activity.company.local/api/activities?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Tipi Attività Disponibili

- `lavoro` - Lavoro ordinario
- `meeting` - Riunioni
- `formazione` - Formazione/training
- `supporto` - Supporto clienti/colleghi
- `ferie` - Ferie
- `festività` - Giorni festivi
- `malattia` - Malattia
- `permesso` - Permessi
- `trasferta` - Trasferte
- `pausa` - Pause
- `altro` - Altro (richiede `customType`)

### Regole Validazione

- **Orari:** Step di 15 minuti (00, 15, 30, 45)
- **Sovrapposizioni:** Non consentite
- **Continuità:** Configurabile (`ACTIVITY_STRICT_CONTINUITY=true/false`)
- **Giornata completa:** Minimo 8 ore (480 min), straordinari consentiti

## Backup

### Automatico con Cron

```bash
# Aggiungi a crontab
crontab -e

# Backup giornaliero alle 02:00
0 2 * * * tar -czf /backup/activity-$(date +\%Y\%m\%d).tar.gz /app/data >> /var/log/activity-backup.log 2>&1
```

### Manuale

```bash
# Backup
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz data/

# Restore
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz
```

### Strategia Backup Raccomandata

1. **Backup giornaliero** automatico con retention 30 giorni
2. **Backup settimanale** con retention 3 mesi
3. **Backup mensile** con retention 1 anno
4. **Storage remoto** (S3, NAS, etc.)

## Troubleshooting

### Errore: "LDAP bind failed"

**Causa:** Credenziali LDAP errate o server irraggiungibile

**Diagnosi:**

```bash
# Test connessione LDAP
ldapsearch -x -H ldap://dc.company.local:389 \
  -D "CN=svc-activity-tracker,OU=Service Accounts,DC=company,DC=local" \
  -w "password" \
  -b "DC=company,DC=local" \
  "(sAMAccountName=test.user)"
```

**Soluzioni:**
- Verifica `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`
- Controlla firewall (porta 389 o 636 per LDAPS)
- Verifica che l'account di servizio non sia scaduto

### Errore: "User not in required group"

**Causa:** Utente non è membro di "Domain Users" (o gruppo configurato)

**Diagnosi (PowerShell su DC):**

```powershell
Get-ADUser -Identity mario.rossi -Properties MemberOf | Select-Object -ExpandProperty MemberOf
```

**Soluzione:**
- Aggiungi utente al gruppo richiesto in Active Directory
- Oppure modifica `LDAP_REQUIRED_GROUP` in `.env`

### Errore: "EACCES: permission denied" su `/data`

**Causa:** Permessi insufficienti sulla directory dati

**Soluzione:**

```bash
# Verifica owner
ls -ld data/

# Imposta permessi corretti
chown -R app-user:app-group data/
chmod -R 700 data/
```

### Errore: "Token expired"

**Causa:** Token JWT scaduto (default 8 ore)

**Soluzione:**
- Effettuare nuovo login
- Aumentare `JWT_EXPIRES_IN` in `.env` se necessario

### Clock Skew / Timezone Issues

**Sintomo:** Date/orari non corrispondono

**Soluzione:**

```bash
# Verifica timezone
echo $TZ
date

# Imposta timezone in .env
TZ=Europe/Rome

# Sincronizza NTP (Linux)
timedatectl set-ntp true

# Windows: Verifica servizio W32Time
```

### Porta già in uso

**Errore:** `EADDRINUSE`

**Soluzione:**

```bash
# Trova processo sulla porta 3000
# Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000

# Kill processo o cambia porta in .env
SERVER_PORT=3001
```

## Monitoring

### Health Check

```bash
curl https://activity.company.local/health
```

### Logs

```bash
# PM2
pm2 logs activity-tracker
pm2 logs activity-tracker --lines 100

# Diretto
tail -f logs/app.log

# Audit log
tail -f data/audit/$(date +%Y/%m/%d).jsonl | jq .
```

### Metriche

```bash
# PM2 monitoring
pm2 monit

# Disk space
df -h data/
du -sh data/*

# Audit log size
du -sh data/audit/
```

## Manutenzione

### Rotazione Audit Log

```bash
# Comprimi log più vecchi di 30 giorni
find data/audit -name "*.jsonl" -mtime +30 -exec gzip {} \;

# Elimina log più vecchi di 2 anni
find data/audit -name "*.gz" -mtime +730 -delete
```

### Pulizia Cache/Lock

```bash
# Rimuovi lock orfani
find data/locks -type f -mtime +1 -delete
```

### Aggiornamento

```bash
# Backup prima di aggiornare
npm run backup  # Se configurato

# Pull nuove versioni
git pull origin main

# Aggiorna dipendenze
npm install

# Restart
pm2 restart activity-tracker
```

## Struttura Directory

```
OnlyUserActivity/
├── data/                       # Directory dati (non in git)
│   ├── users/                  # Profili utenti
│   ├── activities/             # Attività per utente/anno/mese
│   ├── audit/                  # Audit log per anno/mese/giorno
│   ├── admin/                  # Credenziali admin
│   └── locks/                  # Lock file temporanei
├── src/                        # Codice sorgente
│   ├── config/                 # Configurazione
│   ├── middlewares/            # Express middlewares
│   ├── services/               # Business logic
│   ├── routes/                 # Route handlers
│   └── views/                  # Template EJS
├── public/                     # Asset statici
│   ├── css/
│   └── js/
├── tests/                      # Test
├── .env                        # Configurazione (non in git)
├── .env.example                # Template configurazione
└── README.md                   # Questo file
```

## Testing

```bash
# Run tutti i test
npm test

# Run test in watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Sicurezza

### Checklist Pre-Produzione

- [ ] Cambiato `JWT_SECRET` con valore random sicuro
- [ ] Cambiato `ADMIN_SESSION_SECRET` con valore random sicuro
- [ ] Cambiata password admin default
- [ ] HTTPS configurato (reverse proxy o certificati)
- [ ] Firewall configurato (porta applicazione accessibile solo da proxy)
- [ ] LDAP su TLS (ldaps://)
- [ ] Permessi filesystem corretti (700 su `/data`)
- [ ] Backup configurato e testato
- [ ] Monitoring attivo
- [ ] Log rotation configurato

### Best Practices

- Non esporre mai l'applicazione direttamente su Internet senza reverse proxy
- Usare LDAPS invece di LDAP quando possibile
- Rotare i secret periodicamente
- Monitorare audit log per attività sospette
- Testare regolarmente i backup
- Mantenere Node.js e dipendenze aggiornate

## Supporto

- **Issues:** https://github.com/dennidalpos/OnlyUserActivity/issues
- **Documentazione API:** Vedere sezione "Utilizzo API" sopra
- **Logs:** `pm2 logs activity-tracker` o `tail -f logs/app.log`

## Licenza

ISC

## Autori

Sistema progettato e implementato come soluzione enterprise per tracciamento attività aziendali.
