# Project Specification

## Goal
Fornire un sistema web per il tracciamento delle attivita' giornaliere degli utenti con autenticazione locale o LDAP, dashboard utente e pannello amministrativo per configurazione, monitoraggio ed export.

## Scope
- Autenticazione utente locale e LDAP/AD.
- Dashboard utente con inserimento attivita', calendario mensile, riepilogo giornaliero e quick actions.
- Pannello amministrativo per utenti locali, turni, preset contratti, tipi attivita', impostazioni server, monitoraggio ed export.
- API protette da JWT per autenticazione e gestione attivita'.
- Storage file-based per dati applicativi e audit log JSONL.

## Non Scope
- Database relazionali o NoSQL dedicati.
- Integrazioni cloud o servizi esterni oltre a LDAP opzionale.
- Applicazioni mobile native.
- Modalita' di deploy self-contained o single-file come default di progetto.

## Architecture
- Applicazione Node.js CommonJS con Express come web server.
- Entry point in `src/server.js` con avvio HTTP o HTTPS in base alla configurazione.
- Configurazione centralizzata in `src/config/index.js` tramite variabili d'ambiente.
- Routing separato tra API, area utente e area admin in `src/routes`.
- Logica business organizzata in `src/services` per autenticazione, attivita', amministrazione, LDAP, storage e utility.
- Interfaccia server-rendered con viste EJS in `src/views` e asset statici in `public`.
- Persistenza su filesystem sotto `DATA_ROOT_PATH` con file JSON/JSONL e lock file per accessi concorrenti.
- Test presenti con Jest e setup base in `tests/setup.js`.

## Constraints
- Ambiente operativo di riferimento Windows.
- Runtime richiesto Node.js 18+ con npm.
- Persistenza locale su filesystem, senza dipendenza da database esterni.
- HTTPS abilitabile solo con certificato e chiave configurati.
- In produzione devono essere configurati segreti non di default per JWT e sessione admin.
