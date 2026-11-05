# OnlyUserActivity operations guide

[Italian guide](GUIDE.it.md) · [Initial setup](setup-iniziale.md)

OnlyUserActivity records daily work activities through a browser. It supports local or optional LDAP login, an activity calendar, quick actions, administrator monitoring, user/shift/contract settings and CSV/JSON/XLSX exports. The interface is server-rendered with EJS.

## Architecture and prerequisites

The entrypoint is src/server.js. src/app.js configures Express and middleware; src/routes separates user, admin and API routes; src/services owns business logic and filesystem persistence. public contains browser assets and tests contains Jest fixtures.

Use Node.js 20+ for the locked dependency set (Joi 18 requires it). doctor currently checks only Node 18; its success does not qualify Node 18 with every dependency. Windows packaging needs PowerShell, WiX 3.x and NSSM; installed services also require Node on the target.

## Local startup

~~~powershell
npm run bootstrap
Copy-Item .env.example .env
npm run doctor
npm run dev
~~~

Edit .env before startup. Bootstrap does not copy it. Use npm start for normal server execution. The default listener is 0.0.0.0:3001; bind 127.0.0.1 for a local-only trial.

| Setting | Purpose |
|---|---|
| NODE_ENV | development or production |
| SERVER_HOST / SERVER_PORT | Listener, default 0.0.0.0 / 3001 |
| TRUST_PROXY | Trusted proxy hops, default 0 |
| HTTPS_ENABLED / HTTPS_CERT_PATH / HTTPS_KEY_PATH | Optional TLS listener and existing certificate/key |
| JWT_SECRET / JWT_EXPIRES_IN | API signing secret and token lifetime |
| ADMIN_SESSION_SECRET / ADMIN_SESSION_MAX_AGE | Admin cookie-session configuration |
| ADMIN_DEFAULT_USERNAME / ADMIN_DEFAULT_PASSWORD | Initial admin; replace weak defaults before first use |
| LDAP_ENABLED / LDAP_URL / LDAP_BASE_DN | Optional directory login |
| DATA_ROOT_PATH | Filesystem storage root, default ./data |
| AUDIT_LOG_RETENTION_DAYS / AUDIT_PAYLOAD_MODE | Audit retention and redaction behavior |
| LOG_TO_FILE / LOG_FILE_PATH / LOG_LEVEL | Optional application logging |
| RATE_LIMIT_MAX_REQUESTS / LOGIN_RATE_LIMIT_MAX | Request/login limits |
| ACTIVITY_REQUIRED_MINUTES | Daily required minutes, default 480 |
| ALLOW_PROCESS_SUPERVISOR_RESTART | Explicit supervisor-managed restart permission |

Production validation rejects the default JWT/admin-session secret placeholders. It does not enforce a strong initial admin password; configure one explicitly. Keep .env, data, logs, certificates and all real account details outside Git.

## Storage and accounts

The storage root contains users, activities, admin, audit and locks directories. Profiles/settings and activities use JSON; daily audit uses JSONL. There is no database service or SQL migration process.

Users enter through /user/auth/login. When LDAP is enabled, local or LDAP authentication is an explicit choice; the API login also accepts authMethod=local|ldap. The user session supplies a JWT for API requests. Admin login is /admin/auth/login and uses separate session credentials stored under the data root. Cookie-authenticated admin mutations require a CSRF token.

Deleting a local user removes associated activities and rewrites associated audit content. Treat this as destructive administration with its own authorization and recovery policy. AD users cannot be deleted through the local-user operation.

## Routes and API

Protected activity APIs use Authorization: Bearer <token>.

| Route | Purpose |
|---|---|
| POST /api/auth/login | User login |
| GET /api/activities/init?date=YYYY-MM-DD | Dashboard initialization |
| GET /api/activities/types / quick-actions | Activity type and quick-action lists |
| GET /api/activities/month?date=YYYY-MM-DD | Monthly calendar |
| GET /api/activities/:date | Activities for one day |
| POST /api/activities | Create an activity |
| PUT /api/activities/:id?date=YYYY-MM-DD | Update an activity |
| DELETE /api/activities/:id?date=YYYY-MM-DD | Delete an activity |
| GET /api/activities?from=...&to=... | Date-range data |

Administrator pages include /admin/dashboard, /admin/users, /admin/shifts and /admin/settings. Admin APIs manage quick-actions, shift-types, contract-presets, settings and users; /admin/api/server/info reports server state. Restart requests are accepted only for the explicitly configured supervisor workflow. These are application endpoints, not a promise of remote deployment control.

## Logging and security

Application logging to disk is optional. Audit payload redaction covers credential/token fields even in partial mode. JSONL retention is configured separately from a backup policy.

The application includes rate limiting, CSP with nonce, separate user/admin sessions, JWT API auth and admin CSRF checks. These controls do not establish general legal compliance or replace real TLS/directory/service qualification.

## Development commands

| Command | Effect |
|---|---|
| npm run bootstrap | Install dependencies |
| npm run doctor | Check prerequisites, .env and local packaging tools |
| npm run compile | Report that there is no separate compile stage |
| npm run build | doctor then compile |
| npm test | Jest tests |
| npm run test:coverage | Tests plus coverage under artifacts/test-results/coverage |
| npm run pack | Windows MSI staging/build |
| npm run publish | Local copy/manifest under artifacts/publish |
| npm run clean | Destructively remove configured generated directories |

Do not run clean merely to obtain a clean status. It removes artifacts subdirectories, logs, test-data, build/dist/out/publish/tmp and public/build while preserving data. Retain test/build evidence until authorized cleanup.

## MSI and service deployment

The package stage contains production dependencies. build-msi.ps1 uses WiX harvesting with tools/msi/OnlyUserActivity.wxs, preferring local WiX binaries under tools/wix314-binaries. NSSM is taken from tools/nssm. Missing tools are a packaging limitation even if doctor returns only warnings.

Default package output is artifacts/packages/onlyuseractivity-<version>-x64.msi; staging/intermediates are under artifacts/build/windows-msi. npm run publish creates a separate local copy and manifest.

The installer puts application files in Program Files/OnlyUserActivity and configuration/data/logs under the application's ProgramData manufacturer/product directory. It initializes a missing .env from the example and configures ONLYUSERACTIVITY_ENV_PATH, DATA_ROOT_PATH, LOG_FILE_PATH and the supervisor-restart setting for the service.

INSTALL_SERVICE=0|1 controls service registration; START_SERVICE=0|1 controls startup. The WiX source distinguishes major upgrades from a complete uninstall: upgrades retain runtime state; complete uninstall requests removal of runtime logs/configuration. Back up and review these destructive consequences before an installer lifecycle test.

Manual service scripts are install-windows-service.ps1 and remove-windows-service.ps1. They search supported local NSSM paths. Real install, upgrade, service permissions, uninstall, HTTPS and LDAP behavior remain separately qualified; a passing Jest suite does not certify them.

## Help and licensing

Use the repository's issue forms for non-sensitive defects and SECURITY.md for security reports. The project is proprietary; existing LICENSE and CREDITS govern distribution and third-party attribution.
