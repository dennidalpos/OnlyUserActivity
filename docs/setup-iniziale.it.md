# Setup iniziale e configurazione

Questa procedura serve per avviare il progetto in locale con la configurazione minima.

## Requisiti

- Windows con PowerShell
- Node.js 18 o superiore
- npm

## 1. Installa le dipendenze

Apri PowerShell nella root del repository ed esegui:

```powershell
npm run bootstrap
```

## 2. Crea il file di configurazione locale

Copia il file di esempio:

```powershell
Copy-Item .env.example .env
```

## 3. Compila i valori minimi in `.env`

Per un avvio locale semplice bastano in genere questi valori:

- `NODE_ENV=development`
- `SERVER_HOST=0.0.0.0`
- `SERVER_PORT=3001`
- `DATA_ROOT_PATH=./data`
- `ADMIN_DEFAULT_USERNAME=admin`
- `ADMIN_DEFAULT_PASSWORD=admin`
- `LDAP_ENABLED=false`
- `HTTPS_ENABLED=false`

Se l'istanza non e' di sviluppo, cambia subito anche:

- `JWT_SECRET`
- `ADMIN_SESSION_SECRET`
- `ADMIN_DEFAULT_PASSWORD`

## 4. Avvia l'applicazione

Prima dell'avvio verifica la configurazione:

```powershell
npm run doctor
```

Per sviluppo:

```powershell
npm run dev
```

Per esecuzione normale:

```powershell
npm start
```

L'applicazione risponde per default su:

- `http://localhost:3001`

## 5. Primo accesso

- Accesso utente: `http://localhost:3001/user/auth/login`
- Accesso admin: `http://localhost:3001/admin/auth/login`

Al primo avvio il progetto crea automaticamente le cartelle sotto `DATA_ROOT_PATH` e inizializza l'utente admin predefinito usando i valori presenti in `.env`.

## Configurazioni opzionali

### LDAP

Attiva LDAP solo se hai gia' i parametri reali del dominio:

- `LDAP_ENABLED=true`
- `LDAP_URL`
- `LDAP_BASE_DN`
- `LDAP_BIND_DN`
- `LDAP_BIND_PASSWORD`
- `LDAP_USER_SEARCH_FILTER`
- `LDAP_REQUIRED_GROUP` se vuoi limitare l'accesso a un gruppo

### HTTPS

Per HTTPS locale o su server:

- `HTTPS_ENABLED=true`
- `HTTPS_CERT_PATH`
- `HTTPS_KEY_PATH`

I file indicati devono esistere davvero prima dell'avvio.

## Dati e log

- I dati applicativi vengono salvati in `DATA_ROOT_PATH` (`./data` di default).
- I log su file vengono scritti solo se `LOG_TO_FILE=true`.

## Pulizia degli output locali

Per rimuovere output temporanei non versionati:

```powershell
npm run clean
```

Il comando non cancella `data/`.

## Packaging Windows

Per generare il pacchetto MSI locale:

```powershell
npm run pack
```

Output principali:

- `artifacts/packages/`
- `artifacts/build/windows-msi/`
