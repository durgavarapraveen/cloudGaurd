# Contributing to CloudGuard

Thanks for your interest. Issues and pull requests are welcome.

## Before you start

1. Read [Known issues and limitations](Readme.md#known-issues-and-limitations).
   Many rough edges are already recorded there, with the reason.
2. For anything larger than a bug fix, open an issue first so the approach can
   be agreed before you write code.
3. Never report a security problem in a public issue. Follow
   [SECURITY.md](SECURITY.md).

## Setting up

Follow [Quick start with Docker Compose](Readme.md#quick-start-with-docker-compose).
The Compose stack runs PostgreSQL, MongoDB, the API, and the UI together.

```bash
cp infra/.env.example infra/.env
```

Generate the two secrets the stack needs:

```bash
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(48))"
```

```bash
python -c "from cryptography.fernet import Fernet; print('CREDENTIALS_ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

## Architecture rules

Keep the existing layering on the backend:

```text
api/  →  services/  →  repository/  →  models/
```

- `api/` declares routes, dependencies, and response models. No business logic.
- `services/` holds business logic. It raises `HTTPException` for client errors.
- `repository/` holds data access. One concern per function.
- `models/` holds SQLAlchemy models. `schemas/` holds Pydantic models.

Rules that exist for security reasons, so please keep them:

1. **Never take the organization from a client-supplied value.** Use
   `resolve_tenant` or `require_permission` from
   `server/middlewares/userPermissions.py`. The organization comes from the
   signed token; the `X-Tenant-Slug` header may only confirm it.
2. **Scope every query by `organization_id`.** A query without it is a
   cross-tenant leak.
3. **Declare a `response_model` on any route that returns an ORM row for a
   user.** Without one, FastAPI serialises the password hash.
4. **Never log or return secrets.** No tokens, passwords, or cloud
   credentials in `print`, `logger`, or responses.
5. **Encrypt cloud credentials.** Write through `encrypt_credentials` and read
   through `decrypt_credentials` in `server/auth/secrets_box.py`.

## Checks before you open a pull request

Backend:

```bash
cd server && python -m pytest
```

Frontend:

```bash
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

CI runs the same commands on every pull request. See
`.github/workflows/ci.yml`.

## Pull requests

- One concern per pull request. Keep the diff focused.
- Describe how you tested the change, including manual steps.
- Add a test for any bug you fix, where the test suite reaches that code.
- Never commit `.env` files, credentials, or key material. The root
  `.gitignore` blocks the common cases, but check `git diff --cached` anyway.

## Help most wanted

Roughly in order of value:

1. Pydantic response models on the remaining routes.
2. Granular write permissions for the routes that currently share one guard.
3. `HttpOnly` cookie sessions instead of `localStorage`.
4. Alembic migrations.
5. A real test suite; the current one is a smoke test.
6. Azure and GCP collectors.
7. Moving the scheduler out of the API process.
