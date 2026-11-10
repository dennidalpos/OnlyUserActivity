# Initial setup and configuration

[Italian source](setup-iniziale.it.md) · [Operations guide](GUIDE.md)

Use an isolated development checkout and synthetic data first. The application is a Node.js/Express server with JSON/JSONL storage; it does not use SQLite or PostgreSQL.

## Requirements

Use Node.js 20+ with npm and Windows PowerShell for the packaging/service scripts. The current lockfile includes Joi 18, which requires Node 20 even though doctor currently accepts Node 18. Windows MSI/service deployment additionally needs WiX 3.x, NSSM and administrator rights; those are not prerequisites for the browser client.

## Install and configure

From the repository root in PowerShell:

~~~powershell
npm run bootstrap
Copy-Item .env.example .env
~~~

Bootstrap installs dependencies; it does not create .env. Edit that file before startup. For a local-only trial use SERVER_HOST=127.0.0.1, SERVER_PORT=3001, LDAP_ENABLED=false and HTTPS_ENABLED=false. The code's default bind is 0.0.0.0, which exposes the listener on available interfaces.

Set DATA_ROOT_PATH to the intended storage directory. Set ADMIN_DEFAULT_USERNAME and a strong ADMIN_DEFAULT_PASSWORD before first initialization. Development defaults are not a deployment configuration.

For production set NODE_ENV=production and replace both JWT_SECRET and ADMIN_SESSION_SECRET. Startup rejects the default secret placeholders, but this check is not a general credential-strength policy.

~~~powershell
npm run doctor
npm run dev
~~~

Use npm start for ordinary execution. User login is /user/auth/login; admin login is /admin/auth/login. First startup creates the configured storage layout and initializes the admin from the configured defaults. Changing the default password variable later is not a substitute for managing an already-created admin credential.

## Optional integrations

LDAP requires LDAP_ENABLED, LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN, LDAP_BIND_PASSWORD and LDAP_USER_SEARCH_FILTER. LDAP_REQUIRED_GROUP limits access by group. Use a separately qualified protected directory connection; do not test with production credentials in fixtures.

HTTPS requires existing HTTPS_CERT_PATH and HTTPS_KEY_PATH files. For a reverse proxy, configure TRUST_PROXY for the actual trusted hops. Keep environment files, keys, runtime data and logs outside Git.

## Validation and packaging

~~~powershell
npm test -- --runInBand
~~~

Tests use their synthetic setup. Packaging uses npm run pack, stage-windows-package.ps1, build-msi.ps1 and tools/msi/OnlyUserActivity.wxs. Default outputs are artifacts/packages and artifacts/build/windows-msi. npm run publish copies already-built packages and writes a local manifest; it is not a GitHub publication.

Build/package/service lifecycle and real LDAP/HTTPS deployment require separate qualification. Cleanup is destructive: npm run clean removes listed generated output directories and preserves data/, but it must only be run with an explicit reviewed cleanup scope.
