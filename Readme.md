# CloudGuard

CloudGuard is a multi-cloud security and resource management dashboard. It helps users connect cloud accounts, discover resources, manage YAML-based security policies, and scan cloud configurations for risks or misconfigurations.

The project is built as a full-stack application:

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, PostgreSQL, MongoDB
- Cloud integrations: AWS now, with Azure and GCP structure included
- DevOps: Docker and Docker Compose for local development

---

## What You Can Do

- Sign in and use protected dashboard pages.
- Manage users, roles, and permissions.
- Discover cloud resources such as AWS services.
- View resource details and export resource data.
- Create, edit, delete, and view YAML security policies.
- Run security scans and inspect findings by severity, service, and status.
- Use Docker Compose to run frontend, backend, and PostgreSQL together.

---

## Project Structure

```text
cloudGaurd/
  frontend/                 Next.js frontend application
    app/                    App Router pages
    components/             Shared React components
    lib/                    API clients, session helpers, shared utilities
    public/                 Static assets

  server/                   FastAPI backend application
    api/                    API route modules
    auth/                   Authentication logic
    db/                     Database connection setup
    models/                 SQLAlchemy models
    schemas/                Pydantic schemas
    services/               Business logic
    scanners/               Cloud scanner logic
    policies/               Policy-related files

  infra/
    docker-compose.yml      Local Docker Compose setup
    .env                    Compose environment variables

  Readme.md                 Project documentation
```

---

## Prerequisites

Install these before running the project:

- Git
- Docker Desktop
- Node.js 20 or newer, only needed for local frontend development
- Python 3.11 or newer, only needed for local backend development
- A MongoDB connection string
- AWS credentials if you want AWS scanning to work

For the easiest setup, use Docker. Docker runs PostgreSQL, the FastAPI backend, and the Next.js frontend together.

---

## Important Ports

| Service | URL / Port | Notes |
| --- | --- | --- |
| Frontend | `http://localhost:3000` | Next.js app |
| Backend API | `http://localhost:8001` | FastAPI exposed from Docker |
| PostgreSQL | `localhost:5433` | Host access to Docker Postgres |
| PostgreSQL inside Docker | `postgres:5432` | Backend container must use this address |

Important: inside Docker, the backend should not use `localhost:5433` for PostgreSQL. It must use `postgres:5432`, because `postgres` is the Docker Compose service name.

---

## Environment Variables

The Docker setup reads variables from `infra/.env`.

Create or update `infra/.env` with values like this:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>
DATABASE_NAME=cloudgaurdscanner

POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=cloudguard
DATABASE_URL=postgresql+asyncpg://admin:admin123@postgres:5432/cloudguard

JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=replace-with-your-access-key
AWS_SECRET_ACCESS_KEY=replace-with-your-secret-key

NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_BACKEND=http://127.0.0.1:8001
```

Do not commit real AWS keys, MongoDB passwords, or JWT secrets. Use placeholder values in shared documentation and keep real secrets only in local `.env` files.

---

## Run With Docker

From the project root:

```bash
docker compose -f infra/docker-compose.yml up --build
```

After startup:

- Open the frontend at `http://localhost:3000`
- Check the backend at `http://localhost:8001`
- The backend root should return:

```json
{"message":"Welcome to CloudGuard API!"}
```

Run in the background:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

Stop containers:

```bash
docker compose -f infra/docker-compose.yml down
```

View logs:

```bash
docker compose -f infra/docker-compose.yml logs -f
```

View only backend logs:

```bash
docker compose -f infra/docker-compose.yml logs -f server
```

---

## Local Backend Setup

Use this only if you want to run the backend outside Docker.

```bash
cd server
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

For local backend development, your database URL should point to the host PostgreSQL port:

```env
DATABASE_URL=postgresql+asyncpg://admin:admin123@localhost:5433/cloudguard
```

Run the backend:

```bash
uvicorn main:app --reload
```

Local backend URL:

```text
http://localhost:8000
```

---

## Local Frontend Setup

Use this only if you want to run the frontend outside Docker.

```bash
cd frontend
npm install
npm run dev
```

For local frontend development, `frontend/.env.local` should point to the local backend:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND=http://127.0.0.1:8000
```

Frontend URL:

```text
http://localhost:3000
```

---

## Main Application Pages

| Page | Purpose |
| --- | --- |
| `/login` | User login |
| `/signup` | User registration |
| `/` | Security posture dashboard |
| `/findings` | Scan findings table |
| `/resources` | Cloud resource discovery and export |
| `/policies` | YAML policy list |
| `/policies/create` | Create a new YAML policy |
| `/policies/edit/[id]` | Edit an existing policy |
| `/profile` | User management |
| `/roles` | Role and permission management |

---

## Backend Responsibilities

The FastAPI backend handles:

- Authentication and JWT verification
- User, role, and permission APIs
- PostgreSQL persistence for identity and RBAC data
- MongoDB-backed policy storage
- AWS scanner and checker routes
- YAML policy upload, listing, editing, and deletion
- Database table creation during application startup

The backend starts from:

```text
server/main.py
```

---

## Policy Format

Policies are YAML documents with a `rules` list. A simple example:

```yaml
rules:
  - id: "CUSTOM-01"
    title: "S3 bucket should not be public"
    severity: HIGH
    service: s3
    resource_type: s3_bucket
    description: >
      Checks whether an S3 bucket is publicly accessible.
    check:
      path: public_access
      operator: equals
      value: false
    remediation: "Disable public access on the bucket."
```

Each rule usually includes:

- `id`: Unique rule identifier
- `title`: Human-readable rule name
- `severity`: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, or `INFO`
- `service`: Cloud service name
- `resource_type`: Type of resource being checked
- `description`: What the rule checks
- `check`: Path, operator, and optional expected value
- `remediation`: Suggested fix

---

## Useful Development Commands

Frontend lint:

```bash
cd frontend
npm run lint
```

Frontend type check:

```bash
cd frontend
npx tsc --noEmit
```

Run frontend commands inside Docker:

```bash
docker compose -f infra/docker-compose.yml exec frontend npm run lint
```

Rebuild only the frontend service:

```bash
docker compose -f infra/docker-compose.yml up -d --build frontend
```

Rebuild only the backend service:

```bash
docker compose -f infra/docker-compose.yml up -d --build server
```

---

## Troubleshooting

### Backend cannot connect to PostgreSQL

If Docker logs show `Database connection failed` or `Connection refused`, check `DATABASE_URL`.

For Docker:

```env
DATABASE_URL=postgresql+asyncpg://admin:admin123@postgres:5432/cloudguard
```

For local backend:

```env
DATABASE_URL=postgresql+asyncpg://admin:admin123@localhost:5433/cloudguard
```

### Frontend cannot call the backend

Check these values:

Docker frontend:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_BACKEND=http://127.0.0.1:8001
```

Local frontend with local backend:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND=http://127.0.0.1:8000
```

### Docker says old containers are orphans

You may see a warning about orphan containers if services were renamed or removed. You can clean them up with:

```bash
docker compose -f infra/docker-compose.yml up -d --remove-orphans
```

### PowerShell blocks npm scripts

If PowerShell blocks `npm.ps1`, use:

```powershell
npm.cmd run lint
npm.cmd run dev
```

Or run commands inside Docker.

### AWS scanning returns errors

Check:

- AWS access key and secret are present.
- AWS region is correct.
- The IAM user or role has permission to read the selected services.
- The backend container has the updated environment variables.

---

## Security Notes

- Never commit real credentials.
- Rotate any credential that was accidentally committed.
- Use least-privilege AWS IAM permissions for scanning.
- Use a strong `JWT_SECRET_KEY`.
- Avoid printing bearer tokens, passwords, or cloud secrets in logs.

---

## Current Limitations

- AWS support is the most complete cloud integration.
- Azure and GCP entries exist in the UI/structure, but may need additional backend scanner implementation.
- Docker Compose is intended for local development, not production deployment.
- Production deployments should use managed secrets, HTTPS, persistent databases, and stricter CORS settings.

---

## Future Improvements

- Kubernetes deployment manifests
- CI/CD pipeline
- More complete Azure and GCP scanning
- Cloud compliance report generation
- Terraform or IaC integration
- AI-assisted remediation suggestions
- Improved audit logging

---

## Author

Praveen Geda
