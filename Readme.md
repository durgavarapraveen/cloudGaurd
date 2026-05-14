# ☁️ Cloud Guard

Cloud Guard is a multi-cloud security and resource management platform that helps users integrate and monitor cloud providers such as AWS, Azure, and GCP from a single dashboard.

Users can discover cloud resources, write YAML-based security policies, and scan cloud configurations for potential security risks and misconfigurations.

---

## 🚀 Features

- 🔗 Multi-cloud integration
  - AWS
  - Azure
  - GCP

- 📦 Cloud resource discovery

- 🛡️ YAML-based policy validation

- 🔍 Security misconfiguration scanning

- ⚡ Real-time resource monitoring

- 👤 Authentication & authorization

- 🐳 Dockerized development environment

---

## 🛠️ Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- MongoDB

### DevOps

- Docker
- Docker Compose

---

## 📁 Project Structure

```bash
cloudguard/
│
├── frontend/        # Next.js frontend
├── server/          # FastAPI backend
├── infra/           # Docker Compose & infrastructure configs
│
└── README.md
```

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```bash
git clone <your-repository-url>
cd cloudguard
```

---

## 2️⃣ Run with Docker

```bash
docker compose -f infra/docker-compose.yml up --build
```

---

# 🔧 Backend Setup

Navigate to backend directory:

```bash
cd server
```

Create virtual environment:

```bash
python -m venv venv
```

Activate virtual environment:

### Windows

```powershell
.\venv\Scripts\activate
```

### Linux/macOS

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run backend server:

```bash
uvicorn main:app --reload
```

---

# 💻 Frontend Setup

Navigate to frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run frontend server:

```bash
npm run dev
```

---

# 🌍 Environment Variables

Create `.env` file inside the `server/` directory:

```env
DATABASE_URL=
JWT_SECRET_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
MONGO_URI=
```

---

# 🐳 Docker Services

The project includes:

- Frontend Container
- FastAPI Backend Container
- PostgreSQL Database Container

---

# 📌 Future Improvements

- Kubernetes deployment
- RBAC support
- Cloud compliance reports
- Terraform integration
- CI/CD pipelines
- AI-powered recommendations

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Praveen Geda**
