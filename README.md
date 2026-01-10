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

Copia il file di esempio e personalizza le variabili ambiente:

```bash
cp .env.example .env
```

Variabili essenziali:

```env
NODE_ENV=production
SERVER_PORT=3001
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ADMIN_SESSION_SECRET=your-admin-session-secret-min-32-chars
```

### LDAP (opzionale)

```env
LDAP_ENABLED=true
LDAP_URL=ldaps://dc.company.local:636
LDAP_BASE_DN=DC=company,DC=local
LDAP_BIND_DN=CN=ServiceAccount,CN=Users,DC=company,DC=local
LDAP_BIND_PASSWORD=service_account_password
LDAP_USER_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_REQUIRED_GROUP=CN=Domain Users,CN=Users,DC=company,DC=local
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
