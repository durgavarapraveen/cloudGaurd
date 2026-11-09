# Security Policy

## Status of this project

CloudGuard is pre-release software (v0.1). It is a working prototype, not a
hardened product. Do not run it against production cloud accounts without
reading [Known issues and limitations](Readme.md#known-issues-and-limitations)
first.

## Reporting a vulnerability

Report security issues privately. Do not open a public issue.

1. Open a draft advisory under the repository's **Security → Advisories** tab, or
2. Email the maintainer listed in the repository profile.

Include the affected endpoint or file, what an attacker gains, and the steps to
reproduce. A proof-of-concept request is ideal.

Expect an acknowledgement within 7 days. Please allow 90 days before public
disclosure.

Do not test against anyone else's deployment. Use your own local stack.

## Supported versions

Only the `main` branch receives fixes. There are no tagged releases yet.

## Operator checklist

Before exposing a deployment beyond localhost:

- [ ] `JWT_SECRET_KEY` is at least 32 random characters. The application
      refuses to start without it.
- [ ] `CREDENTIALS_ENCRYPTION_KEY` is set, so stored cloud credentials are
      encrypted at rest.
- [ ] `ALLOW_ROOT_REGISTRATION` is unset or `false`, so `/root_user/register`
      is closed after the first operator exists.
- [ ] `CORS_ALLOW_ORIGIN_REGEX` matches only the hosts you serve.
- [ ] The API and UI are served over HTTPS behind a reverse proxy.
- [ ] Scanning IAM identities are read-only and least-privilege.
- [ ] PostgreSQL and MongoDB are not reachable from the public internet.
- [ ] Every new user changed the temporary password they were emailed.

## What is already addressed

These were found and fixed during a security pass over v0.1:

- Cross-tenant data access through a client-supplied `X-Tenant-Slug` header.
  The organization is now taken from the signed token, and a mismatching slug
  is rejected.
- Roles were looked up without an organization filter, so a role row from one
  tenant could be attached to another tenant's user.
- Argon2 password hashes were returned in API responses. Affected routes now
  declare response models that exclude the hash.
- Cloud credentials were stored in plaintext. They are now encrypted with
  Fernet before being written.
- A URL fragment (`#session=`) was read into `localStorage` without
  validation, which allowed session fixation through a crafted link. The code
  path was removed.
- `/root_user/register` was permanently open. It now closes once a platform
  operator exists.
- An empty `JWT_SECRET_KEY` was accepted, which made tokens forgeable.
  Startup now fails.
- Accounts created by an operator all received the password `12345678`. A
  random temporary password is now generated and emailed.

## Known remaining weaknesses

- Tokens are kept in `localStorage`, so any cross-site scripting flaw can read
  them. Moving to `HttpOnly` cookies is tracked as future work.
- The scheduler runs inside the API process. Two API replicas run duplicate
  jobs.
- There are no database migrations. Schema changes need manual intervention.
