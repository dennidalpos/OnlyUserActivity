# Security Policy

## Supported versions

Only the latest commit on the `main` branch is supported.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub's private vulnerability reporting: open the **Security** tab of this repository and choose **Report a vulnerability**. Include the affected component (authentication, admin panel, API, LDAP integration, MSI/service scripts), reproduction steps and the impact you observed. Remove real user data from any evidence you attach.

You can expect an acknowledgement within a few days. Confirmed issues are fixed on `main` and disclosed after a fix is available.

## Scope notes

- `JWT_SECRET`, `ADMIN_SESSION_SECRET`, the admin password and LDAP credentials are supplied through `.env` and must never be committed. In `production` the server refuses to start with the default JWT and session secrets.
- The initial admin password defaults to `admin`; change it before exposing the server.
- Dependencies are monitored with Dependabot and secret scanning with push protection.
