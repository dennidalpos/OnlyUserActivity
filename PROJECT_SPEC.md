# Project specification

OnlyUserActivity is a browser-based daily activity tracker with local or optional LDAP authentication. Its current implementation includes user activity entry/calendar/quick actions, administrator monitoring, local-user and shift/contract configuration, exports and protected API routes.

## Architecture

- Node.js CommonJS entrypoint in src/server.js, with Express configured in src/app.js.
- Environment configuration in src/config/index.js.
- User/admin/API routes, service logic, EJS views and static browser assets.
- JSON/JSONL filesystem persistence under DATA_ROOT_PATH, including application settings, activities, audit and lock files.
- Jest unit/integration fixtures.
- PowerShell staging and WiX 3.x MSI packaging with optional NSSM service registration.

There is no SQLite, PostgreSQL or external database backend. No native mobile client or self-contained Node runtime is provided by the documented package.

## Operational boundaries

Use Node.js 20+ for the current locked dependency set. Windows is the reference packaging/service platform. HTTPS needs explicit existing certificate/key paths; production startup rejects default JWT/admin-session secret placeholders. Initial admin credentials still require an explicit secure configuration.

MSI files are under tools/msi, not a promised packaging/msi standardization target. Local packaging scripts exist, but installation/upgrade/uninstall, directory connectivity and production security require their own evidence. UI and retained detailed Italian documentation do not imply an English UI.

See the [English operations guide](docs/GUIDE.md) and [initial setup](docs/setup-iniziale.md). The original [Italian specification](PROJECT_SPEC.it.md) is retained for reference.
