# OnlyUserActivity

Web system to track users' daily activities, with local or LDAP authentication, a user dashboard and an admin panel for configuration, monitoring and data export.

## Features

- **Authentication**: local users with hashed passwords, or LDAP/Active Directory (optional).
- **User dashboard**: activity entry, monthly calendar, daily summary and quick actions.
- **Admin panel**: attendance monitoring, local user management, shifts, contract presets, activity types and server settings.
- **Required hours per user**: daily required minutes computed from the contract presets assigned to a shift or a user.
- **Audit log**: JSONL event log with optional payload redaction and configurable retention.
- **Data export**: CSV, JSON and XLSX, as summaries or details.
- **Security**: rate limiting, CSP with nonce, separate admin and user sessions, CSRF protection for admin mutations, JWT for the API.
- **Windows deployment**: MSI package and Windows service scripts.

## Stack

Node.js with Express, EJS views, JWT, optional LDAP through `ldapts`, and file-based storage (JSON/JSONL) in local folders. There is no database server.

## Requirements

- Node.js 20+ with npm for the current lockfile (Joi 18 requires Node 20). The existing doctor script still accepts Node 18; that check alone does not establish compatibility.
- Windows for the MSI and service scripts; the server itself runs wherever Node.js does.

## Getting started

```powershell
npm run bootstrap
Copy-Item .env.example .env
npm run doctor
```

Edit `.env` before the first start (bootstrap does not copy it, so the initial configuration stays explicit). Then:

```powershell
npm run dev     # development, with nodemon
npm start       # production
```

The server listens on `SERVER_HOST:SERVER_PORT` (default `0.0.0.0:3001`).

### Main configuration variables

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` or `production` | `development` |
| `SERVER_HOST`, `SERVER_PORT` | Listen address | `0.0.0.0`, `3001` |
| `HTTPS_ENABLED`, `HTTPS_CERT_PATH`, `HTTPS_KEY_PATH` | Optional HTTPS listener | `false` |
| `JWT_SECRET`, `ADMIN_SESSION_SECRET` | Secrets; must be changed in `production` or startup fails | placeholder |
| `ADMIN_DEFAULT_USERNAME`, `ADMIN_DEFAULT_PASSWORD` | Initial admin account | `admin` / `admin` |
| `LDAP_ENABLED` | Enable LDAP login | `false` |
| `DATA_ROOT_PATH` | Storage root | `./data` |
| `AUDIT_LOG_RETENTION_DAYS` | Audit retention | `730` |
| `RATE_LIMIT_MAX_REQUESTS`, `LOGIN_RATE_LIMIT_MAX` | Rate limits | `100`, `5` |
| `TRUST_PROXY` | Trusted proxy hops | `0` |
| `ACTIVITY_REQUIRED_MINUTES` | Required minutes per day | `480` |

Set a strong admin password before exposing the server: the default admin password is `admin`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run bootstrap` | Install dependencies |
| `npm run doctor` | Check prerequisites, `.env` and local tools |
| `npm run build` | Run `doctor` and `compile` (there is no separate compilation step) |
| `npm test` | Run the Jest suite |
| `npm run pack` | Build the Windows MSI package |
| `npm run publish` | Copy packaged artifacts to `artifacts/publish` |
| `npm run clean` | Destructively remove generated local output; requires an explicit reviewed cleanup scope |

## Project structure

| Path | Content |
| --- | --- |
| `src/` | Express app, middleware, routes, services and EJS views |
| `public/` | Frontend CSS and JavaScript |
| `tests/` | Jest unit and integration tests |
| `scripts/`, `tools/msi/` | Automation, Windows service scripts and the WiX MSI template |
| `docs/` | English guides and retained Italian sources |

## Documentation

The [English operations guide](docs/GUIDE.md) covers authentication, API, storage, audit, tests and MSI/service packaging. The [Italian guide](docs/GUIDE.it.md) is retained. See also [PROJECT_SPEC.md](PROJECT_SPEC.md) and [initial setup](docs/setup-iniziale.md).

## Security

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

Proprietary, all rights reserved. See [LICENSE](LICENSE). Third-party components are listed in [CREDITS.md](CREDITS.md).
