# Quick Start Guide

Guida rapida per avviare il progetto in locale senza LDAP (modalità sviluppo).

## Setup Rapido (5 minuti)

### 1. Installazione

```bash
# Clone repository
git clone https://github.com/dennidalpos/OnlyUserActivity.git
cd OnlyUserActivity

# Installa dipendenze
npm install
```

### 2. Configurazione Minima

Il file `.env` è già presente. Per test locali, modifica solo:

```bash
# Apri .env e assicurati che sia impostato:
NODE_ENV=development
LOG_LEVEL=debug

# Per test SENZA LDAP, commenta temporaneamente la validazione
# (Normalmente l'app fallirà senza LDAP configurato)
```

### 3. Avvio in Sviluppo

```bash
npm run dev
```

Il server partirà su `http://localhost:3000`

### 4. Accesso Admin

1. Apri browser: `http://localhost:3000/admin`
2. Credenziali default:
   - **Username:** `admin`
   - **Password:** `admin`

## Test API (senza LDAP)

**NOTA:** Senza LDAP configurato, il login utenti fallirà. Per testare l'API:

### Opzione 1: Mock LDAP (Raccomandato)

Installa mock LDAP server:

```bash
npm install --save-dev ldap-server-mock
```

Crea file `test-ldap-server.js`:

```javascript
const { createServer } = require('ldap-server-mock');

const server = createServer();

server.bind('CN=admin,DC=test,DC=local', 'admin', (req, res, next) => {
  res.end();
  return next();
});

server.search('DC=test,DC=local', (req, res, next) => {
  res.send({
    dn: 'CN=Test User,DC=test,DC=local',
    attributes: {
      sAMAccountName: 'testuser',
      displayName: 'Test User',
      mail: 'test@test.local',
      memberOf: ['CN=Domain Users,DC=test,DC=local']
    }
  });
  res.end();
  return next();
});

server.listen(1389, () => {
  console.log('LDAP mock server listening on port 1389');
});
```

Modifica `.env`:

```bash
LDAP_URL=ldap://localhost:1389
LDAP_BASE_DN=DC=test,DC=local
LDAP_BIND_DN=CN=admin,DC=test,DC=local
LDAP_BIND_PASSWORD=admin
```

Avvia in due terminali:

```bash
# Terminal 1: Mock LDAP
node test-ldap-server.js

# Terminal 2: App
npm run dev
```

### Opzione 2: Bypass LDAP (Solo Dev)

Modifica temporaneamente `src/services/ldap/ldapAuth.js`:

```javascript
// SOLO PER SVILUPPO - Commenta codice LDAP e usa mock:
async authenticate(username, password) {
  // Mock user per test
  if (username === 'testuser' && password === 'test123') {
    let user = await userStorage.findByUsername(username);
    if (!user) {
      user = await userStorage.create({
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        department: 'IT',
        metadata: { mock: true }
      });
    }
    return user;
  }
  throw new Error('Username o password non validi');
}
```

## Test Flow Completo

### 1. Login API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

Risposta:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userKey": "...",
    "username": "testuser",
    "displayName": "Test User",
    "expiresAt": "..."
  }
}
```

Salva il token per le prossime chiamate.

### 2. Crea Attività

```bash
TOKEN="your-token-here"

curl -X POST http://localhost:3000/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-02",
    "startTime": "09:00",
    "endTime": "11:00",
    "activityType": "lavoro",
    "notes": "Test attività"
  }'
```

### 3. Lista Attività

```bash
curl http://localhost:3000/api/activities/2026-01-02 \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Dashboard Admin

1. Vai su `http://localhost:3000/admin/dashboard`
2. Seleziona data: 2026-01-02
3. Dovresti vedere l'utente "testuser" con 2 ore (50% completamento)

## Verifica Filesystem

Controlla che i dati siano salvati:

```bash
# Windows
dir data\users
dir data\activities
dir data\audit

# Linux/Mac
ls -la data/users/
ls -la data/activities/
ls -la data/audit/
```

Dovresti vedere:
- `data/users/index.json` - Mapping username
- `data/users/{uuid}.json` - Profilo utente
- `data/activities/{uuid}/2026/01.json` - Attività gennaio
- `data/audit/2026/01/02.jsonl` - Log audit

## Troubleshooting Rapido

### Errore: "LDAP_URL is required"

Assicurati che `.env` contenga:
```bash
LDAP_URL=ldap://localhost:1389  # o mock
LDAP_BASE_DN=DC=test,DC=local
```

### Errore: "ENOENT: no such file or directory"

Crea directory mancanti:
```bash
mkdir -p data/{users,activities,audit,admin,locks}
```

### Errore: "Port 3000 already in use"

Cambia porta in `.env`:
```bash
SERVER_PORT=3001
```

### Database non si popola

Verifica permessi:
```bash
# Windows
icacls data /grant Users:F /t

# Linux/Mac
chmod -R 755 data/
```

## Prossimi Passi

1. ✅ App funzionante in locale
2. 📖 Leggi `README.md` per configurazione produzione
3. 🏗️ Leggi `ARCHITECTURE.md` per capire architettura
4. 🔧 Configura LDAP reale aziendale
5. 🚀 Deploy su server con reverse proxy

## Supporto

Per problemi:
1. Controlla logs: guarda output console di `npm run dev`
2. Verifica `.env` configurazione
3. Controlla che directory `data/` sia scrivibile
4. Issues: https://github.com/dennidalpos/OnlyUserActivity/issues
