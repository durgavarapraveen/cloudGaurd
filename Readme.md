# CloudGuard

CloudGuard is a self-hosted **Cloud Security Posture Management (CSPM)** platform. It connects to your cloud
accounts, pulls a resource inventory, evaluates that inventory against YAML policy rules, and reports findings
by severity, service, and status.

It is multi-tenant. One deployment serves many organizations. Each organization is reached through its own
subdomain slug and has its own users, roles, groups, permissions, cloud accounts, and findings.

| Area | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS 4 |
| Backend | FastAPI 0.116, Python 3.11, SQLAlchemy 2 (async), Pydantic 2 |
| Relational store | PostgreSQL 16 (identity, RBAC, cloud accounts, resources, scans, findings, drift) |
| Document store | MongoDB (YAML policy documents) |
| Scheduler | APScheduler (AsyncIOScheduler) in the API process |
| Cloud SDK | boto3 (AWS) |
| Policy engine | JMESPath expressions over collected resource JSON |
| Email | fastapi-mail (SMTP) |
| Local orchestration | Docker Compose |

---

## Table of contents

1. [Status of this release](#status-of-this-release)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Repository layout](#repository-layout)
5. [Prerequisites](#prerequisites)
6. [Environment variables](#environment-variables)
7. [Quick start with Docker Compose](#quick-start-with-docker-compose)
8. [Local development without Docker](#local-development-without-docker)
9. [Multi-tenancy and how to reach the UI](#multi-tenancy-and-how-to-reach-the-ui)
10. [First-run setup walkthrough](#first-run-setup-walkthrough)
11. [Connecting an AWS account](#connecting-an-aws-account)
12. [Policy format](#policy-format)
13. [Application pages](#application-pages)
14. [API reference](#api-reference)
15. [Database schema](#database-schema)
16. [Scheduler](#scheduler)
17. [Email](#email)
18. [Verified build and runtime report](#verified-build-and-runtime-report)
19. [Known issues and limitations](#known-issues-and-limitations)
20. [Security notes](#security-notes)
21. [Troubleshooting](#troubleshooting)
22. [Contributing](#contributing)
23. [License](#license)

Also in this repository: [SECURITY.md](SECURITY.md) for the security policy and
operator checklist, and [CONTRIBUTING.md](CONTRIBUTING.md) for development
setup and architecture rules.

---

## Status of this release

CloudGuard is **pre-release software (v0.1)**. Treat it as a working prototype, not a production product.

What is verified working: service startup, schema creation, authentication, multi-tenant RBAC, policy CRUD,
cloud account CRUD, resource inventory read APIs, scheduler creation, and every UI page.

A security pass has since fixed cross-tenant data access, plaintext cloud
credentials, leaked password hashes, a session-fixation sink, a hardcoded
default password and an unguarded operator-registration endpoint.
[SECURITY.md](SECURITY.md) lists what changed and what an operator must still
configure.

What remains incomplete is in
[Known issues and limitations](#known-issues-and-limitations). Read it before
you deploy, and note item 1: a private key is exposed in this repository's
git history.

---

## Features

### Working

- **Multi-tenant organizations.** A root operator creates organizations. Each organization has a URL slug.
- **Two sign-in paths.** Root operator sign-in (`/rootLogin`) and organization user sign-in (`/login`).
- **JWT authentication.** HS256 access and refresh tokens. A global middleware rejects unauthenticated requests.
- **RBAC.** Per-organization permissions, roles, and user groups. Permissions are checked per endpoint and
  cached in process.
- **Cloud account registry.** Register AWS, Azure, GCP, or OCI accounts with per-account credentials.
- **AWS resource inventory.** Collect resources from 15 AWS services and store them in PostgreSQL with
  per-fetch summaries.
- **YAML policy management.** Upload, list, view, edit, and delete policy documents. Policies live in MongoDB.
  The UI includes a YAML editor.
- **Policy engine.** JMESPath-based rule evaluation with 11 operators, producing PASS / FAIL / ERROR / SKIP.
- **Findings storage.** Scans and findings are persisted with severity, service, expected value, and actual value.
- **Drift tracking.** Detected configuration drift can be assigned to a user group, commented on, and moved
  through statuses.
- **Scheduled inventory fetches.** Create a scheduler per cloud account with a fetch time, an interval in hours,
  and a stop date. Missed runs are caught up on API restart.
- **Transactional email.** Account-created, forgot-password, change-password, and scheduler notification templates.

### Scaffolded, not complete

- Azure, GCP, and OCI are accepted as providers and appear in the UI, but only AWS has a scanner.
  `server/engine/loader/azure_loader.py` and `server/engine/loader/aws_loader.py` are present but unused.
- `server/policies/azure/vm.yaml` holds 10 Azure rules with no Azure collector to evaluate them against.

---

## Architecture

```text
                    acme.localhost:3000              localhost:3000
                    (organization UI)                (root operator UI)
                              │                             │
                              └──────────────┬──────────────┘
                                             ▼
                              ┌──────────────────────────────┐
                              │  Next.js frontend            │
                              │  /backend/* → rewrite proxy  │
                              └──────────────┬───────────────┘
                                             │ same-origin HTTP
                                             ▼
                              ┌──────────────────────────────┐
                              │  FastAPI backend             │
                              │  AuthMiddleware (JWT)        │
                              │  require_permission (RBAC)   │
                              │  APScheduler                 │
                              └───┬─────────┬─────────┬──────┘
                                  │         │         │
                 ┌────────────────┘         │         └──────────────┐
                 ▼                          ▼                        ▼
        ┌────────────────┐         ┌─────────────────┐      ┌─────────────────┐
        │ PostgreSQL     │         │ MongoDB         │      │ AWS APIs        │
        │ identity, RBAC │         │ YAML policy     │      │ via boto3 with  │
        │ inventory,     │         │ documents       │      │ per-account     │
        │ scans, findings│         │                 │      │ credentials     │
        └────────────────┘         └─────────────────┘      └─────────────────┘
```

Request flow for a protected call:

1. The browser calls a same-origin path such as `/backend/cloud_accounts`.
2. Next.js rewrites it to the backend (`BACKEND_INTERNAL_URL`).
3. `AuthMiddleware` decodes the JWT and puts `user_id`, `privilege`, `organizationId`, and `permissions`
   on the request state.
4. `require_permission("...")` resolves the tenant from the `X-Tenant-Slug` header and checks the permission.
5. The route calls a service, the service calls a repository, the repository uses the async SQLAlchemy session.

Scan flow:

1. `GET /resources/resources_cloud/{account_identifier}` collects live resources from AWS and stores them.
2. `GET /dashboard/scanServices/{account_identifier}` loads stored resources, loads policy rules from MongoDB,
   and evaluates each rule with JMESPath.
3. The result is written to `scans` and `findings`.

---

## Repository layout

```text
cloudGaurd/
├── Readme.md                        This file
├── frontend/                        Next.js application
│   ├── app/
│   │   ├── (public)/                Landing page and auth pages
│   │   ├── (org)/                   Organization-scoped pages
│   │   └── (admin)/                 Root operator pages
│   ├── components/                  Shared React components
│   ├── lib/
│   │   ├── api.ts                   Typed API client, token refresh, tenant slug resolution
│   │   ├── props.ts                 Shared TypeScript types
│   │   ├── routes.ts                Public and protected route lists
│   │   └── session.ts               Token and permission storage helpers
│   ├── proxy.ts                     Next.js proxy (URL rewrites for nested routes)
│   ├── next.config.ts               Redirects, /backend/* rewrite, Turbopack config
│   ├── Dockerfile.dev               Development image
│   └── Dockerfile.prod              Multi-stage production image
├── server/                          FastAPI application
│   ├── main.py                      App factory, lifespan, CORS, routers
│   ├── api/                         Route modules (one per domain)
│   ├── services/                    Business logic
│   ├── repository/                  Data access
│   ├── models/                      SQLAlchemy ORM models
│   ├── schemas/                     Pydantic request and response models
│   ├── auth/                        Password hashing, JWT creation and verification
│   ├── middlewares/                 Auth middleware, permission dependency
│   ├── cache/                       In-process permission and org-id caches
│   ├── db/
│   │   ├── postgressDB.py           Async engine, session factory, get_db
│   │   └── db.py                    Motor client for MongoDB
│   ├── engine/checker/aws_checker.py  Policy evaluation engine
│   ├── scanners/AWS/                AWS collectors, one module per service
│   ├── policies/                    Seed YAML policies (aws/, azure/)
│   ├── schedulars/                  APScheduler setup and jobs
│   ├── templates/email/             HTML email templates
│   ├── requirements.txt             Pinned Python dependencies
│   └── Dockerfile                   Backend image
└── infra/
    └── docker-compose.yml           PostgreSQL + backend + frontend
```

---

## Prerequisites

| Requirement | Version used to verify this release | Needed for |
| --- | --- | --- |
| Docker Engine | 29.8.0 | Compose workflow |
| Docker Compose | v5.5.1 | Compose workflow |
| Node.js | 24.14.0 locally, 20 in the image | Local frontend development |
| npm | 11.9.0 | Local frontend development |
| Python | 3.13 locally, 3.11 in the image | Local backend development |
| PostgreSQL | 16 (container) | Always |
| MongoDB | 7 (container or Atlas) | Always — policies will not load without it |
| AWS IAM credentials | — | AWS scanning only |
| SMTP credentials | — | Email only; can be suppressed |

MongoDB is **required** and is included in `infra/docker-compose.yml`, so the
Compose workflow needs nothing extra. Point `MONGO_URI` at Atlas instead if you
prefer a managed instance.

---

## Environment variables

The backend loads variables from the process environment, then from `server/.env`, then from `infra/.env`.
Compose reads `infra/.env`. Create that file; it is git-ignored.

### Backend

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Async PostgreSQL DSN, for example `postgresql+asyncpg://admin:<password>@postgres:5432/cloudguard`. Must use the `postgresql+asyncpg://` scheme; the API refuses to start without it. |
| `MONGO_URI` | yes | `mongodb://localhost:27017` | MongoDB connection string. |
| `DATABASE_NAME` | no | `cloudgaurdscanner` | MongoDB database name. |
| `JWT_SECRET_KEY` | yes | — | HS256 signing key. Must be at least 32 characters; the API refuses to start otherwise, because an empty key makes every token forgeable. |
| `CREDENTIALS_ENCRYPTION_KEY` | strongly advised | empty | Fernet key encrypting `cloud_accounts.credentials` at rest. Without it credentials are stored as plaintext and every read logs a warning. Comma-separate to rotate: `<new>,<old>`. |
| `ALLOW_ROOT_REGISTRATION` | no | `false` | `true` reopens `POST /root_user/register` after a platform operator exists. Leave it off. |
| `CORS_ALLOW_ORIGIN_REGEX` | no | localhost and its subdomains | Regex of browser origins allowed to call the API. Set it to your own hosts in production. |
| `AWS_REGION` | no | `ap-south-1` | Default region hint. |
| `AWS_DEFAULT_REGION` | no | `ap-south-1` | Default region hint. |
| `AWS_ACCESS_KEY_ID` | no | — | Read by the scanner module, but scans use per-cloud-account credentials from the database. |
| `AWS_SECRET_ACCESS_KEY` | no | — | As above. |
| `FRONT_END_URL` | for email | — | Base URL used to build password-reset links. |
| `MAIL_USERNAME` | for email | empty | SMTP user. |
| `MAIL_PASSWORD` | for email | empty | SMTP password. |
| `MAIL_FROM` | for email | `MAIL_USERNAME` | Envelope sender. |
| `MAIL_PORT` | no | `587` | SMTP port. |
| `MAIL_SERVER` | no | `smtp.gmail.com` | SMTP host. |
| `MAIL_FROM_NAME` | no | `CloudGuard` | Display name. |
| `MAIL_STARTTLS` | no | `true` | STARTTLS switch. |
| `MAIL_SSL_TLS` | no | `false` | Implicit TLS switch. |
| `MAIL_SUPPRESS_SEND` | no | `false` | Set to `true` to log instead of sending. Use this for local development. |
| `SUPPORT_URL` | no | empty | Link in email footers. |
| `PRIVACY_URL` | no | empty | Link in email footers. |

### Database credentials used by the Postgres container

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER` | Role created in the container. |
| `POSTGRES_PASSWORD` | Password for that role. |
| `POSTGRES_DB` | Database created in the container. |

The container healthcheck is hardcoded to `pg_isready -U admin -d cloudguard`. If you change `POSTGRES_USER`
or `POSTGRES_DB`, also change the healthcheck in `infra/docker-compose.yml`.

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `BACKEND_INTERNAL_URL` | yes | Server-side rewrite target for `/backend/*`. In Compose this is `http://server:8000`. |
| `NEXT_PUBLIC_BACKEND_URL` | no | Absolute backend URL used by the browser. **Leave this unset.** See the warning below. |
| `NEXT_PUBLIC_BACKEND` | no | Fallback absolute backend URL. **Leave this unset.** |
| `NEXT_PUBLIC_ROOT_DOMAIN` | for production | Apex domain, for example `cloudguard.example.com`. The tenant slug is the label in front of it. |

> **Warning — set no `NEXT_PUBLIC_BACKEND*` value.**
> When either variable is set, the browser calls the backend cross-origin. The backend CORS allowlist in
> `server/main.py` contains only `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3001`, and
> `http://127.0.0.1:3001`. A tenant origin such as `http://acme.localhost:3000` is **not** in that list, so the
> browser blocks the login preflight and the UI shows `Failed to fetch`.
> With both variables unset, `lib/api.ts` falls back to the relative path `/backend`, Next.js rewrites it
> server-side, and no CORS check applies. This is the only configuration in which tenant sign-in works.

### Example `infra/.env`

A ready-to-copy template is committed as `infra/.env.example`:

```bash
cp infra/.env.example infra/.env
```

```env
# PostgreSQL container
POSTGRES_USER=admin
POSTGRES_PASSWORD=replace-with-a-password
POSTGRES_DB=cloudguard

# Backend -> PostgreSQL (service name inside the Compose network)
DATABASE_URL=postgresql+asyncpg://<user>:<password>@postgres:5432/cloudguard

# Backend -> MongoDB
MONGO_URI=mongodb://mongo:27017
DATABASE_NAME=cloudgaurdscanner

# Auth
JWT_SECRET_KEY=change-me-to-a-long-random-string

# AWS defaults
AWS_REGION=ap-south-1
AWS_DEFAULT_REGION=ap-south-1

# Email (suppressed locally)
MAIL_SUPPRESS_SEND=true
MAIL_FROM=no-reply@example.com
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_FROM_NAME=CloudGuard

# URLs
FRONT_END_URL=http://localhost:3000
BACKEND_INTERNAL_URL=http://server:8000
```

Do not commit real credentials. Keep secrets in `infra/.env` or `server/.env` only.

---

## Quick start with Docker Compose

### 1. Create the environment file

Copy the example above into `infra/.env`. Change `JWT_SECRET_KEY`.

### 2. Generate the two secrets

The API refuses to start without `JWT_SECRET_KEY`, and warns when
`CREDENTIALS_ENCRYPTION_KEY` is missing because cloud credentials then cannot be
encrypted at rest.

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Put the first in `JWT_SECRET_KEY` and the second in
`CREDENTIALS_ENCRYPTION_KEY` in `infra/.env`.

To rotate the encryption key later, put the new key first and keep the old one
after it: `CREDENTIALS_ENCRYPTION_KEY=<new>,<old>`. New writes use the first
key; reads try each in turn.

### 3. Build and start the stack

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

The first build takes several minutes. It installs Python wheels and the npm tree.

### 4. Check the services

```bash
docker compose -f infra/docker-compose.yml ps
```

```bash
curl http://localhost:8001/
```

The backend must answer:

```json
{ "message": "Welcome to CloudGuard API!" }
```

### 5. Open the applications

| Target | URL |
| --- | --- |
| Root operator UI | `http://localhost:3000/rootLogin` |
| Organization UI | `http://<slug>.localhost:3000/login` |
| API root | `http://localhost:8001/` |
| Interactive API docs | `http://localhost:8001/docs` |
| PostgreSQL from the host | `localhost:5433` |

### Published ports

| Service | Host port | Container port |
| --- | --- | --- |
| frontend | 3000 | 3000 |
| server | 8001 | 8000 |
| postgres | 5433 | 5432 |
| mongo | 27017 | 27017 |

Inside the Compose network, use the service names: `postgres:5432`, `server:8000`. Do not use `localhost` in
container-to-container URLs.

### Everyday commands

```bash
docker compose -f infra/docker-compose.yml logs -f server
```

```bash
docker compose -f infra/docker-compose.yml restart server
```

```bash
docker compose -f infra/docker-compose.yml up -d --build frontend
```

```bash
docker compose -f infra/docker-compose.yml down
```

To delete the database volume as well:

```bash
docker compose -f infra/docker-compose.yml down -v
```

---

## Local development without Docker

### Backend

1. Start PostgreSQL and MongoDB from Compose:

```bash
docker compose -f infra/docker-compose.yml up -d postgres mongo
```

2. Create and activate a virtual environment.

Windows PowerShell:

```powershell
cd server; python -m venv venv; .\venv\Scripts\Activate.ps1
```

Linux or macOS:

```bash
cd server && python -m venv venv && source venv/bin/activate
```

3. Install the dependencies.

```bash
pip install -r requirements.txt
```

4. Create `server/.env` with host-facing values:

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@localhost:5433/cloudguard
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=cloudgaurdscanner
JWT_SECRET_KEY=change-me-to-a-long-random-string-of-32-chars-or-more
CREDENTIALS_ENCRYPTION_KEY=
ALLOW_ROOT_REGISTRATION=false
MAIL_SUPPRESS_SEND=true
FRONT_END_URL=http://localhost:3000
```

5. Start the API.

```bash
uvicorn main:app --reload
```

The API listens on `http://localhost:8000`.

`db/postgressDB.py` rewrites `@postgres:5432` to `@localhost:5433` when it does not detect a container, so a
Compose-style `DATABASE_URL` also works outside Docker.

### Frontend

1. Install the dependencies.

```bash
cd frontend && npm install
```

2. Create `frontend/.env.local`:

```env
BACKEND_INTERNAL_URL=http://localhost:8000
```

3. Start the dev server.

```bash
npm run dev
```

The UI listens on `http://localhost:3000`.

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

### Checks

```bash
cd frontend && npx tsc --noEmit
```

```bash
cd frontend && npm run lint
```

```bash
cd frontend && npm run build
```

Backend tests:

```bash
cd server && python -m pytest
```

They cover the security invariants: tenant isolation, credential encryption,
temporary passwords, response models, CORS and the startup guards. CI runs them
with the frontend checks on every pull request
(`.github/workflows/ci.yml`).

---

## Multi-tenancy and how to reach the UI

The tenant is taken from the **hostname**, not from a path or a picker.

`frontend/lib/api.ts` resolves the slug like this:

1. `localhost` exactly → no slug. Root operator context.
2. `<slug>.localhost` → the slug is the first label. Example: `acme.localhost` → `acme`.
3. With `NEXT_PUBLIC_ROOT_DOMAIN` set, `<slug>.<root-domain>` → the slug is the first label. The apex and
   `www.` are treated as no slug.
4. Without `NEXT_PUBLIC_ROOT_DOMAIN`, any hostname with three or more labels → the slug is the first label.

The slug is sent to the backend as the `X-Tenant-Slug` header. `require_permission` maps the slug to an
organization id and caches it.

Consequences:

- Organization users **must** sign in at `http://<slug>.localhost:3000/login`. Signing in at
  `http://localhost:3000/login` sends no slug, and organization-scoped calls then fail with
  `Missing organization context. Send X-Tenant-Slug header.`
- The root operator signs in at `http://localhost:3000/rootLogin`.
- Modern browsers resolve `*.localhost` to `127.0.0.1` with no hosts-file edit. If yours does not, add a line
  to your hosts file: `127.0.0.1 acme.localhost`.

---

## First-run setup walkthrough

The platform is invite-only by design. There is no self-service signup page. A root operator creates the first
organization and its first user.

### Step 1 — create the root operator

This endpoint is unauthenticated so the first operator can be created on a
fresh deployment. It closes itself once an operator exists; a second call
returns HTTP 403. Set `ALLOW_ROOT_REGISTRATION=true` only if you deliberately
need to reopen it.

```bash
curl -X POST http://localhost:8001/root_user/register -H 'Content-Type: application/json' -d '{"username":"rootadmin","password":"ChangeThisPassword123!","role":"rootUser"}'
```

### Step 2 — sign in as the root operator

Open `http://localhost:3000/rootLogin` and sign in. The UI lands on `/admin/organization`.

### Step 3 — create an organization

Use the **New Organization** button. Provide a name, a slug, and a description. The slug becomes the tenant
subdomain. By API:

```bash
curl -X POST "http://localhost:8001/root_user/create/organization/<ROOT_USER_ID>" -H "Authorization: Bearer <ROOT_ACCESS_TOKEN>" -H 'Content-Type: application/json' -d '{"name":"Acme Corp","slug":"acme","description":"Acme cloud estate"}'
```

### Step 4 — create the organization's first user

From the root console, create a user inside the organization. The user receives the `rootUserOrg` role, which
bypasses per-permission checks inside that organization. By API:

```bash
curl -X POST http://localhost:8001/root_user/create -H "Authorization: Bearer <ROOT_ACCESS_TOKEN>" -H "X-Tenant-Slug: acme" -H 'Content-Type: application/json' -d '{"username":"alice","email":"alice@example.com","organizationId":"<ORGANIZATION_ID>"}'
```

> **Note.** The request body has no password field. The backend generates a 16-character random temporary
> password and emails it with the "Your CloudGuard Account is Ready" template, together with the organization's
> sign-in URL. The password is never returned by the API and never stored in plain text.
>
> With `MAIL_SUPPRESS_SEND=true` the email is only logged, so the password is not recoverable. Either set up
> SMTP before you create users, or have the new user go through `/forgot-password`.
>
> Tell the new user to change the password at `/organization/change-password` after the first sign-in.

### Step 5 — sign in as the organization user

Open `http://acme.localhost:3000/login`. Use the email and the password from step 4. The UI lands on
`/organization/institution`.

### Step 6 — define permissions and roles

1. Open `/organization/roles`.
2. Create the permission strings your endpoints require, for example `cloudAccount:create`,
   `cloudAccount:read`, `resource:read`, `resource:summary:read`, `yaml:upload`, `yaml:policies:read`,
   `yaml:policies:edit`, `yaml:policies:delete`, `users:create`, `users:read`, `users:delete`, `roles:read`,
   `roles:write`, `roles:delete`, `permissions:read`, `permissions:write`, `permissions:delete`.
3. Create roles and attach permissions to them.
4. Assign roles to users at `/organization/profile`.

Permission strings are free text. They are not seeded. A user with no matching permission receives HTTP 403.
The `rootUserOrg` role skips these checks.

### Step 7 — load policies

1. Open `/organization/<account_identifier>/policies`.
2. Use **Create New Policy** and paste a YAML document, or seed from the repository files in
   `server/policies/aws/`.

By API:

```bash
curl -X POST http://localhost:8001/yaml/upload/ -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: acme" -H 'Content-Type: application/json' -d '{"provider":"aws","service":"s3","yaml_content":"rules:\n  - id: CIS-S3-01\n    title: demo\n    severity: HIGH\n    service: s3\n    resource_type: s3_bucket\n    check:\n      path: versioning.Status\n      operator: equals\n      value: Enabled\n"}'
```

---

## Connecting an AWS account

### Step 1 — create a read-only IAM user

Create an IAM user with programmatic access and attach a read-only policy. AWS `ReadOnlyAccess` works but is
broad. A least-privilege policy for the bundled collectors needs `Describe*`, `List*`, and `Get*` on these
services: S3, EC2, EBS, RDS, IAM, ACM, EFS, RAM, PrivateLink (EC2 endpoints), KMS, ECR, ECS, ElastiCache,
Route 53, and Transit Gateway (EC2). STS `GetCallerIdentity` is also required.

### Step 2 — register the account in CloudGuard

1. Open `/organization/institution`.
2. Choose **Link New Account**.
3. Select AWS, then enter an account name, the 12-digit account id, a region, the access key id, and the
   secret access key.

By API, the credential keys matter — the backend reads `access_key_id` and `secret_access_key`:

```bash
curl -X POST http://localhost:8001/cloud_accounts/create -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: acme" -H 'Content-Type: application/json' -d '{"provider":"aws","account_name":"prod","account_identifier":"123456789012","region":"ap-south-1","credentials":{"access_key_id":"AKIA...","secret_access_key":"..."}}'
```

Sign in as an **organization** user for this call. A root-operator token carries no organization claim, so
`POST /cloud_accounts/create` fails with HTTP 500 when called with a root token.

### Step 3 — fetch the inventory

```bash
curl "http://localhost:8001/resources/resources_cloud/123456789012?services=s3,ec2,iam" -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: acme"
```

Omit `services` to scan every supported service. Supported values:

`s3`, `iam`, `ec2`, `rds`, `acm`, `efs`, `ebs`, `ram`, `privatelink`, `kms`, `ecr`, `ecs`, `elasticache`,
`route53`, `transitGateway`

Each fetch writes a `resource_summary` row and upserts `resources` rows. A content hash per resource drives
drift detection on later fetches.

### Step 4 — evaluate policies

The dashboard's **Run Scan** button calls `GET /dashboard/scanServices/{account_identifier}`:

```bash
curl "http://localhost:8001/dashboard/scanServices/123456789012" -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: acme"
```

The endpoint loads every stored resource for the account, loads all policy rules from MongoDB, evaluates each
rule with JMESPath, writes a `scans` row and its `findings` rows, and returns a summary:

```json
{
  "success": true,
  "scan_id": "01a1bed9-16b2-7103-86dc-c762a052f8b1",
  "summary": {
    "total": 10, "passed": 1, "failed": 9, "errored": 0, "score": 10.0,
    "by_severity": { "CRITICAL": 4, "HIGH": 2, "MEDIUM": 3, "LOW": 0, "INFO": 0 },
    "by_service": { "s3": 10 },
    "total_resources": 1
  },
  "findings": [ "..." ]
}
```

Results then appear on the dashboard and on the Findings page.

---

## Policy format

A policy document is a YAML mapping with a top-level `rules` list. Upload rejects anything else.

```yaml
rules:
  - id: CIS-S3-07
    title: "S3 bucket versioning must be enabled"
    description: >
      Versioning protects against accidental deletion and overwrite.
    severity: MEDIUM
    service: s3
    resource_type: s3_bucket
    cis_reference: "CIS AWS Foundations Benchmark v2.0 — 2.1.3"
    check:
      path: versioning.Status
      operator: equals
      value: Enabled
    remediation: "Enable versioning on the bucket."
```

### Rule fields

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Unique rule identifier. Appears on findings. |
| `title` | yes | Human-readable rule name. |
| `severity` | yes | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, or `INFO`. |
| `service` | yes | Must match the resource's `service` value, for example `s3`. |
| `resource_type` | yes | Must match the resource's `resource_type`, for example `s3_bucket`. |
| `check.path` | yes | JMESPath expression evaluated against the resource JSON. |
| `check.operator` | yes | One of the operators below. |
| `check.value` | depends | Expected value. Not needed for `exists`, `not_exists`, `is_true`, `is_false`. |
| `description` | no | Explanation shown in the UI. |
| `remediation` | no | Suggested fix. |
| `cis_reference` | no | Benchmark citation. |

### Operators

| Operator | Passes when |
| --- | --- |
| `exists` | The value is present and not null. |
| `not_exists` | The value is absent or null. |
| `equals` | The value equals `check.value`. |
| `not_equals` | The value differs from `check.value`. |
| `is_true` | The value is boolean true. |
| `is_false` | The value is boolean false. |
| `contains` | A list or string contains `check.value`. |
| `not_contains` | A list or string does not contain `check.value`. |
| `contains_key` | A list of dicts has an item whose `Key` equals `check.value`. |

### Path resolution

The engine evaluates `check.path` against a flattened resource dictionary. That dictionary contains
`resource_id`, `service`, `resource_type`, `resource_identifier`, `resource_name`, `region`, `provider`, `arn`,
`tags`, `configuration`, and every top-level key of `configuration` spread in directly. So both
`configuration.versioning.Status` and `versioning.Status` resolve.

### Bundled policies

| File | Provider | Rules |
| --- | --- | --- |
| `server/policies/aws/s3.yaml` | AWS | 10 |
| `server/policies/aws/ec2.yaml` | AWS | 6 |
| `server/policies/aws/vpc.yaml` | AWS | 5 |
| `server/policies/azure/vm.yaml` | Azure | 10 (no Azure collector yet) |

These files are seed material. They are not loaded automatically. Upload them through the UI or the API.

---

## Application pages

### Public

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page with a request-access form. |
| `/login` | Organization user sign-in. Needs a tenant subdomain. |
| `/rootLogin` | Root operator sign-in. |
| `/forgot-password` | Request a password-reset email. |
| `/reset-password` | Set a new password with a reset token. |

### Root operator

| Route | Purpose |
| --- | --- |
| `/admin/organization` | List and create organizations. |
| `/admin/[orgId]` | Manage one organization and its users. |

### Organization

| Route | Purpose |
| --- | --- |
| `/organization/institution` | Cloud account list, per-provider counts, remove accounts. |
| `/organization/institution/linknewaccount` | Register a cloud account and its credentials. |
| `/organization/profile` | Users, groups, role assignment, enable and disable users. |
| `/organization/roles` | Permissions and roles. |
| `/organization/change-password` | Change the signed-in user's password. |
| `/organization/[id]` | Security posture dashboard and scan history. |
| `/organization/[id]/findings` | Findings table with severity, service, and status filters. |
| `/organization/[id]/policies` | Policy list grouped by provider and service. |
| `/organization/[id]/policies/create` | YAML editor for a new policy. |
| `/organization/[id]/policies/edit/[policyId]` | YAML editor for an existing policy. |
| `/organization/[id]/resource_summary` | Inventory fetch summaries. |
| `/organization/[id]/resource_summary/[summary_id]` | Resources captured in one fetch. |
| `/organization/[id]/resource_summary/resources` | Full stored inventory, paginated. |
| `/organization/[id]/schedular` | Scheduler list and creation. |
| `/organization/[id]/schedular/details/[schId]` | One scheduler's runs. |
| `/organization/[id]/drift` | Drift queue with assignment, status, and comments. |

`[id]` in organization routes is the **cloud account identifier** (for AWS, the 12-digit account id), not the
organization UUID.

`next.config.ts` keeps older URLs working. `/organization/:id/resources` redirects to
`/organization/:id/resource_summary`, and `/organization/:id/scheduler/*` redirects to `.../schedular/*`.

---

## API reference

Base URL: `http://localhost:8001` in Compose, `http://localhost:8000` when run locally.
Interactive documentation: `/docs` (Swagger UI) and `/redoc`.

### Conventions

- Send `Authorization: Bearer <access_token>` on every route except those listed as public.
- Send `X-Tenant-Slug: <organization-slug>` on every organization-scoped route.
- Access tokens expire after 15 minutes. Refresh tokens expire after 7 days. The frontend refreshes
  automatically on a 401.

### Public routes

| Method | Path |
| --- | --- |
| GET | `/` |
| GET | `/docs`, `/redoc`, `/openapi.json` |
| POST | `/root_user/register`, `/root_user/login`, `/root_user/login/{organizationID}`, `/root_user/refresh-token` |
| POST | `/auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/forgot-password`, `/auth/reset-password` |

### Root operator — `/root_user`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/register` | Create a root operator. |
| POST | `/login` | Sign in. Returns access and refresh tokens. |
| POST | `/login/{organizationID}` | Sign in scoped to one organization. Returns the slug. |
| POST | `/refresh-token` | Exchange a refresh token. |
| GET | `/organizations/{userId}` | List organizations owned by a root operator. |
| POST | `/create` | Create a user inside an organization. Requires `users:create`. |
| POST | `/create/organization/{userId}` | Create an organization. Requires `users:create`. |
| GET | `/allUsers/{organizationId}` | List an organization's users. |
| DELETE | `/delete/{userId}` | Delete a user. |

### Authentication — `/auth`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/register` | Self-register a user. Requires `organizationId` in the body. |
| POST | `/login` | Sign in with email and password. |
| POST | `/refresh-token` | Exchange a refresh token. |
| PUT | `/logout/{user_id}` | Mark the user inactive. |
| DELETE | `/delete/{user_id}` | Delete a user. |
| POST | `/change_password/{userId}` | Change a password. `oldPassword` and `newPassword` are query parameters. |
| POST | `/forgot-password` | Send a reset email. `email` is a query parameter. |
| POST | `/reset-password` | Consume a reset token and set a new password. |

### Organizations — `/organization`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/create` | Create an organization. |
| GET | `/` | List organizations. |
| GET | `/{id}` | Read one organization. |
| PUT | `/update/{id}` | Update an organization. |
| PUT | `/deactivate/{id}` | Deactivate an organization. |
| PUT | `/delete/{id}` | Soft-delete an organization. |

The handlers for `/{id}`, `/update/{id}`, `/deactivate/{id}`, and `/delete/{id}` do not bind the path
parameter. See [Known issues](#known-issues-and-limitations) item 4.

### Users — `/users`

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/create` | `users:create` |
| GET | `/` | `users:read` |
| GET | `/id/{user_id}` | `users:read` |
| GET | `/email/{email}` | `users:read` |
| GET | `/by-roles` | `users:read` |
| PUT | `/edit-roles/{user_id}` | `users:update` |
| PUT | `/edit-info/{user_id}` | `users:update` |
| DELETE | `/delete/{user_id}` | `users:delete` |

### Roles — `/roles`

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/` | `roles:read` |
| POST | `/create` | `roles:write` |
| GET | `/id/{id}` | `roles:read` |
| GET | `/name/{name}` | `roles:read` |
| PUT | `/rolepermissions/id/{id}` | `roles:write` |
| DELETE | `/delete/{id}` | `roles:delete` |

### Permissions — `/permissions`

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/` | `permissions:read` |
| POST | `/create` | `permissions:write` |
| DELETE | `/delete/{id}` | `permissions:delete` |

### User groups — `/group`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | List groups. |
| GET | `/{id}` | Read one group by UUID. |
| POST | `/create` | Create a group. Body needs `name`, `description`, and `permissions`. |
| PUT | `/edit/{id}` | Update a group. |
| PUT | `/addUsers/{id}` | Add users to a group. |
| DELETE | `/delete/{id}` | Delete a group. |

### Cloud accounts — `/cloud_accounts`

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/create` | `cloudAccount:create` |
| GET | `` | `cloudAccount:read` |
| GET | `/{id}` | `cloudAccount:read` |
| DELETE | `/{id}` | `cloudAccount:delete` |

### Resources — `/resources`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/resources_cloud/{account_identifier}` | `resource:read` | Collect live resources from AWS and store them. Optional `services` query, comma-separated. |
| GET | `/resources/{account_identifier}` | `resource:read` | Read stored resources. Supports `page`, `page_size`, `service`. |
| GET | `/summary/{account_identifier}` | `resource:summary:read` | List inventory fetch summaries. |
| GET | `/summary_ID/{resourceSummaryID}` | `resource:summary:read` | Read one summary. |
| GET | `/summary_ID/{resourceSummaryID}/{resourceId}` | `resource:summary:read` | Read one resource inside a summary. |

### Dashboard — `/dashboard`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/recent-scans/{accountIdentifier}` | Recent scans. `limit` 1–100, default 25. |
| GET | `/scans/{scan_id}` | One scan with its findings. |
| GET | `/scanServices/{accountIdentifier}` | Evaluate policies over stored resources. Writes a scan and its findings. |

### Policies — `/yaml`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| POST | `/upload/` | `yaml:upload` | Store a YAML policy document. |
| GET | `/policies` | `yaml:policies:read` | List policies. Optional `provider`, `service`. |
| GET | `/policies/{provider}` | `yaml:policies:read` | List one provider's policies. |
| GET | `/policy/{document_id}` | `yaml:policies:read` | Read one policy. |
| PUT | `/policy/{document_id}` | `yaml:policies:edit` | Replace one policy. |
| DELETE | `/policies/{document_id}` | `yaml:policies:delete` | Delete one policy. |

### Schedulers — `/schedulars`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/{accountIdentifier}` | List schedulers for a cloud account. |
| POST | `/create/{account_identifier}` | Create a scheduler. Body: `name`, `fetch_time`, `frequency` (hours), `stop_date`. |
| PUT | `/update/{schedularId}` | Update a scheduler. |
| GET | `/active/{schedularId}` | Activate a scheduler. |
| GET | `/inactive/{schedularId}` | Deactivate a scheduler. |
| GET | `/schedular/{schedularId}` | Read scheduler details. |
| GET | `/status/{schedularId}` | Read scheduler status. |
| DELETE | `/delete/{schedularId}` | Delete a scheduler. |

### Drift — `/drift`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/{accountIdentifier}` | Drift list. Supports `page`, `page_size`, `status`. |
| GET | `/user/{accountIdentifier}` | Drift assigned to the signed-in user. |
| PUT | `/update_admin/{driftId}` | Assign drift to a group. `assigned_grp` is a query parameter. |
| PUT | `/update_user/{driftId}` | Update drift status or add a comment. |

### Not mounted

`server/api/cloud_routes.py` defines a `/cloud` router that `main.py` never includes. It is dead code.

---

## Database schema

`Base.metadata.create_all` runs at startup and creates 19 tables. There is no migration tool, so a model change
needs a manual migration or a volume reset.

| Table | Purpose |
| --- | --- |
| `rootUsers` | Platform operators. Username, Argon2 password hash, role. |
| `organization` | Tenants. Name, slug, description, owner, active and deleted flags. |
| `users` | Organization users. Email, username, Argon2 hash, organization id. |
| `password_reset_tokens` | Hashed reset tokens with expiry. |
| `roles` | Per-organization roles. |
| `permissions` | Per-organization permission strings. |
| `role_permissions` | Role to permission mapping. |
| `user_roles` | User to role mapping. |
| `user_groups` | Per-organization groups. |
| `userGroup_users` | Group membership. |
| `userGroup_permissions` | Group to permission mapping. |
| `cloud_accounts` | Registered cloud accounts, credentials, scan status. Unique on (organization, provider, account name). |
| `resource_summary` | One row per inventory fetch, with added, updated, and deleted counts and id lists. |
| `resources` | Resource inventory. Configuration and tags as JSONB, plus a content hash. Unique on (organization, cloud account, resource id, region). |
| `scans` | Policy evaluation runs. |
| `findings` | Per-rule results with status, severity, expected value, actual value, operator. |
| `drift_resources` | Detected drift with status and assignment. |
| `comments` | Comments on drift items. |

Passwords use Argon2id through `passlib`.

---

## Scheduler

APScheduler runs inside the API process, not as a separate worker.

On startup, `main.py`:

1. Creates the database tables.
2. Starts the `AsyncIOScheduler`.
3. Loads every active `resource_schedular` row.
4. Deactivates any scheduler past its stop date.
5. Registers an interval job per scheduler, using `frequency` in **hours** and the next occurrence of
   `fetch_time` as the start date.
6. Queues a one-off catch-up job when today's run time has passed and `last_scan` is older than it.

Each job calls the AWS inventory fetch for its cloud account and updates `last_scan`.

Because the scheduler lives in the API process, running more than one API replica runs duplicate jobs.
Use a single replica, or move the scheduler out, before scaling.

---

## Email

`server/services/mail_service.py` sends four templates from `server/templates/email/`:

| Template | Sent when |
| --- | --- |
| `admin_created_user.html` | A root operator creates a user. |
| `change_password.html` | A password changes. |
| `scheduler_template.html` | A scheduled fetch reports results. |
| `Normalemail_templete.html` | Generic notification. |

Set `MAIL_SUPPRESS_SEND=true` during development. Sends are then logged, not delivered, and user creation works
with no SMTP server. Send failures are caught and logged; they do not fail the request.

---

## Verified build and runtime report

Executed against this commit on Windows 11 with Docker Engine 29.8.0, Docker
Compose v5.5.1, Node 24.14.0 and npm 11.9.0. The stack ran from
`infra/docker-compose.yml` (Python 3.11-slim, Node 20-alpine, PostgreSQL 16,
MongoDB 7) on a freshly created volume.

### Build and static checks

| Check | Command | Result |
| --- | --- | --- |
| Frontend install | `npm install` | Succeeded. |
| TypeScript | `npx tsc --noEmit` | Passed, no errors. |
| ESLint | `npm run lint` | Passed: 0 errors, 43 warnings. |
| Production build | `npm run build` | Succeeded, 24 routes. |
| npm advisories | `npm audit` | 8 moderate, 0 high, 0 critical (was 20 / 8 / 1 before the Next upgrade). |
| Backend tests | `python -m pytest` | 30 passed. |
| Backend byte-compile | `python -m compileall` | Clean. |
| Compose config | `docker compose config -q` | Valid, 4 services. |
| CI secret scan | tracked-file grep | No key material, no env files, no secret-shaped strings. |

### Runtime

| Check | Result |
| --- | --- |
| PostgreSQL container | Healthy. |
| MongoDB container | Healthy, started by Compose. |
| Backend container | Healthy. Log shows `PostgreSQL connected successfully` and `Scheduler started`. |
| Schema creation | 19 tables created on first boot. |
| `GET /` | 200 `{"message":"Welcome to CloudGuard API!"}` |
| `GET /docs` | 200. |
| Unauthenticated requests | 401 on `/cloud_accounts`, `/users/`, `/drift/{id}`. |

### Security fixes, verified by re-running the original attack

| Check | Result |
| --- | --- |
| **Cross-tenant read** — a Globex user sending `X-Tenant-Slug: acme` | **403 `Organization mismatch`** on `/cloud_accounts`, `/resources/resources/{id}`, `/resources/summary/{id}`, `/users/`, `/roles/`, `/dashboard/recent-scans/{id}`, `/drift/{id}`. Every one of these returned 200 with another tenant's data before the fix. |
| Role scoping | Each user now holds their own organization's role. Previously a Globex user held Acme's `rootUserOrg` row. |
| Credentials at rest | Stored as `{"__enc__": 1, "ciphertext": "gAAAAA..."}`. A query for the plaintext secret matches 0 rows. |
| Credential decryption | The scan path decrypts and reaches AWS STS, which rejects the test key. |
| Password hashes in responses | 0 occurrences of `argon2` across `/users/id/{id}`, `/users/`, `/roles/`, `/root_user/organizations/{id}`. |
| Operator registration | First call 200; second call **403 `Root registration is closed`**. |
| Root-only routes, called by an organization user | 403 `Root operator privilege required`. |
| Invalid AWS credentials | **400 `Invalid AWS access key ID`** (was an unhandled 500). |
| Malformed UUID path parameter | **422** (was 500). |
| Duplicate email | 409 on `/root_user/create`, 400 on `/users/create`. |
| Unknown organization id | 404 `Organization not found`. |

### Functional flows

| Flow | Result |
| --- | --- |
| Operator bootstrap, login, organization creation (2 tenants) | 200. |
| Organization user creation, both paths | 200, random temporary password, account email queued. |
| Organization user login | 200. |
| Cloud account create and list | 200, credentials encrypted. |
| Policy upload, list, read, edit; invalid YAML rejected | 200 / 400 as appropriate. The bundled 10-rule S3 policy round-trips. |
| Resource inventory reads, summaries, drift, schedulers | 200. |
| **`GET /dashboard/scanServices/{id}`** | **200.** 10 rules evaluated against a seeded S3 resource: 9 FAIL, 1 PASS, score 10.0, counted by severity and service. A `scans` row and 10 `findings` rows persisted. This endpoint returned 500 on every call before the fix. |

### UI

| Page | Result |
| --- | --- |
| `acme.localhost:<port>/login` | Sign-in succeeded, redirected to `/organization/institution`. |
| `/organization/institution` | Shows the registered AWS account. |
| `/organization/<acct>/findings` | Shows 3 persisted scans with score, checks, failures and severity counts. |
| `/rootLogin` → `/admin/organization` | Sign-in succeeded; both tenants listed. |
| Browser console | No application errors. The previous `<tr> cannot contain a nested <a>` warning is gone. |

AWS collection against a real account was **not** verified; no live AWS
credentials were used. The code path was confirmed as far as the AWS STS call,
including decryption of the stored credential.

## Known issues and limitations

Ordered by severity. Problems fixed during the hardening pass are listed in
[SECURITY.md](SECURITY.md) rather than here.

1. **A private key exists in git history.** `infra/github_private_key.pem`
   contains an RSA private key, committed in `ae3e967` and reachable from the
   remote branch `sprint-1-compliance-security`. It is not in `main`'s tree,
   but history still holds it, and **this repository is public**, so the key is
   already exposed. Revoke it in the GitHub App's settings, then either rewrite
   that branch to drop the file or delete the branch. That branch also holds 8
   commits of unmerged work, so copy anything worth keeping first.
   `server/certs/cert.pem` and `server/certs/key.pem` are also in history but
   are empty files.

2. **Sessions live in `localStorage`.** Any cross-site scripting flaw can read
   the access and refresh tokens. Moving to `HttpOnly` cookies with a
   server-side guard is the fix, and would also remove the setState-in-effect
   auth hydration that the lint config currently downgrades.

3. **Permissions are coarse in places.** `/dashboard/*`, `/drift/*`,
   `/schedulars/*` and `/group/*` are tenant-bound and gated, but several read
   routes share one permission per router. Mutating routes have their own write
   permission.

4. **The `rootUserOrg` role bypasses every permission check.** Every user an
   operator creates receives it, so in practice the first user of an
   organization is an unrestricted admin inside that organization. Create
   narrower roles for everyone else.

5. **No database migrations.** `Base.metadata.create_all` runs at startup, so a
   model change needs a manual migration or a volume reset. Alembic is the
   intended fix. One consequence today: organizations created before this
   release have `is_active = false` and are rejected by
   `GET /organization/{id}`. Backfill with
   `update organization set is_active = true;`.

6. **The scheduler runs in the API process.** More than one API replica runs
   duplicate jobs. Run a single replica, or move the scheduler out, before
   scaling.

7. **Only AWS is implemented.** Azure, GCP and OCI are selectable and stored,
   but only AWS has collectors. `server/policies/azure/vm.yaml` holds 10 rules
   with nothing to evaluate them against.

8. **Temporary passwords are delivered only by email.** With
   `MAIL_SUPPRESS_SEND=true` the message is logged and the password cannot be
   recovered, so a user created in that state must go through
   `/forgot-password`. Configure SMTP before creating users.

9. **Eight moderate npm advisories remain.** All are in the dev-time lint chain
   (`typescript-eslint`, and `minimatch` via `eslint-config-next`) and need a
   breaking major bump that conflicts with the pinned Next release. None of it
   ships to the browser. `npm audit` shows the current state.

10. **Two lint rules are downgraded to warnings.**
    `react-hooks/set-state-in-effect` and
    `react-hooks/preserve-manual-memoization` are errors in
    `eslint-config-next` 16.4. The auth guards read `localStorage` after mount,
    which needs exactly that pattern. See the comment in
    `frontend/eslint.config.mjs`; item 2 removes the need for it.

11. **Docker Compose is a development setup.** It bind-mounts source, runs
    `uvicorn --reload` and `next dev`, and serves plain HTTP. Production needs
    managed secrets, HTTPS, a persistent database and the production frontend
    image (`frontend/Dockerfile.prod`).

12. **The test suite is a smoke test.** `server/tests/test_security.py` covers
    the security invariants: tenant isolation, credential encryption,
    temporary passwords, response models, CORS and the startup guards. There is
    no coverage of the scanners, the policy engine or the frontend.

13. **Most routes still lack response models.** The routes that leaked password
    hashes now declare them; others return ORM rows or hand-built dicts. Adding
    models throughout would make the OpenAPI schema accurate and prevent the
    next accidental field leak.

14. **`getOrganization` rejects an inactive organization with HTTP 400.** The
    status should be 403 or 404; 400 implies a malformed request.

## Security notes

The application now enforces most of this itself. What it cannot enforce is
listed as a checklist in [SECURITY.md](SECURITY.md); the short version:

1. Set `JWT_SECRET_KEY` to at least 32 random characters. Startup fails
   without it.
2. Set `CREDENTIALS_ENCRYPTION_KEY`, or cloud credentials are stored
   unencrypted and the API logs a warning on every read.
3. Leave `ALLOW_ROOT_REGISTRATION` unset or `false` once the first operator
   exists.
4. Narrow `CORS_ALLOW_ORIGIN_REGEX` to the hosts you actually serve. The
   default covers localhost and its subdomains only.
5. Serve the API and UI over HTTPS behind a reverse proxy.
6. Give scanning IAM identities read-only, least-privilege access.
7. Keep PostgreSQL and MongoDB off the public internet.
8. Never commit `.env` files or key material. The root `.gitignore` blocks the
   common cases and CI fails the build if key material appears.
9. Report vulnerabilities privately, as described in
   [SECURITY.md](SECURITY.md).

Report a security problem privately; never in a public issue.

## Troubleshooting

### `Failed to fetch` on the sign-in page

Cause: a `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_BACKEND` value makes the
browser call the API cross-origin from a tenant subdomain.

The default `CORS_ALLOW_ORIGIN_REGEX` now covers `*.localhost`, so this works
locally either way, but the same-origin path is still the supported one.

Fix:

1. Remove both variables from `infra/.env` and `frontend/.env.local`.
2. Keep `BACKEND_INTERNAL_URL` set.
3. Restart the frontend.

In production, set `CORS_ALLOW_ORIGIN_REGEX` to match your own hosts.

### The API will not start

The API now refuses to start on a configuration that would be unsafe or
unusable. Read the message in the log:

- `JWT_SECRET_KEY is not set` or `too short` — generate one of at least 32
  characters.
- `Cannot start CloudGuard: the database is unreachable` — check
  `DATABASE_URL`. Earlier releases started anyway and failed every request.

### HTTP 403 `Organization mismatch`

Cause: the `X-Tenant-Slug` header names a different organization than the one
in your token. This is the tenant-isolation guard working as intended.

Fix: sign in at the organization's own subdomain. One account cannot act on
another organization.

### HTTP 403 `Root operator privilege required`

Cause: an organization user called a route reserved for platform operators,
such as `/organization/*` or `/root_user/organizations/{id}`.

Fix: sign in at `/rootLogin` for operator work.

### `Stored credentials could not be decrypted with any configured key`

Cause: `CREDENTIALS_ENCRYPTION_KEY` changed without keeping the previous key.

Fix: add the old key after the new one
(`CREDENTIALS_ENCRYPTION_KEY=<new>,<old>`). If it is lost, re-link the affected
cloud accounts.

### `Missing organization context. Send X-Tenant-Slug header.`

Cause: you signed in at `localhost` rather than at the tenant subdomain.

Fix: sign in at `http://<slug>.localhost:3000/login`.

### `pymongo.errors.ServerSelectionTimeoutError`

Cause: no reachable MongoDB.

Fix: Compose includes a `mongo` service, so bring the whole stack up rather
than individual services. Inside Compose, `MONGO_URI` must use the service
name: `mongodb://mongo:27017`.

### `Database connection failed` or `Connection refused` in the backend log

Cause: the wrong `DATABASE_URL` host or port.

Fix: inside Docker, use `postgresql+asyncpg://<user>:<password>@postgres:5432/cloudguard`. On the host, use
`postgresql+asyncpg://<user>:<password>@localhost:5433/cloudguard`.

### `Bind for 0.0.0.0:3000 failed: port is already allocated`

Cause: another process or container holds port 3000.

Fix: stop that container, or change the frontend port mapping in `infra/docker-compose.yml`.

### HTTP 403 `Permission denied`

Cause: the signed-in user's roles do not include the permission string the endpoint requires.

Fix: create the permission at `/organization/roles`, attach it to a role, and assign that role to the user.
Permissions are cached per process; sign out and in again, or restart the backend, to clear the cache.

### HTTP 500 on `POST /cloud_accounts/create`

Cause: you called it with a root-operator token, which carries no organization claim.

Fix: sign in as an organization user and retry.

### `Missing AWS credentials`

Cause: the stored credential object uses the wrong keys.

Fix: store `access_key_id` and `secret_access_key`. The backend reads exactly these names.

### PowerShell blocks `npm`

Fix: use `npm.cmd` instead of `npm`.

### Orphan container warnings from Compose

Fix:

```bash
docker compose -f infra/docker-compose.yml up -d --remove-orphans
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, the
architecture rules (including the ones that exist for security reasons), the
checks CI runs, and where help is most useful.

## License

Released under the [MIT License](LICENSE).

---

## Author

Praveen Geda
