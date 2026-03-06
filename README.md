# TaskFlow API 🚀

A **production-grade REST API** built with Django REST Framework + MongoDB, featuring JWT authentication, role-based access control, and a React frontend.

---

## 📐 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 + Django 4.2 + Django REST Framework |
| Database | MongoDB (via djongo) |
| Auth | JWT (SimpleJWT) — access + refresh token rotation |
| Frontend | React 18 + Vite |
| Docs | Swagger UI (drf-yasg) |
| Deploy | Docker + Docker Compose |

---

## 🗂 Project Structure

```
taskflow/
├── backend/
│   ├── apps/
│   │   ├── authentication/     # User model, JWT auth, RBAC
│   │   │   ├── models.py       # Custom User with role field
│   │   │   ├── serializers.py  # Register, Login, Profile, Admin
│   │   │   ├── views.py        # Auth endpoints
│   │   │   ├── permissions.py  # IsAdmin, IsOwnerOrAdmin
│   │   │   └── urls.py
│   │   └── tasks/              # CRUD entity
│   │       ├── models.py       # Task model (status, priority, tags)
│   │       ├── serializers.py
│   │       ├── views.py        # List/Create/Detail + Stats
│   │       └── urls.py
│   ├── taskflow/
│   │   ├── settings.py         # Django config, JWT, CORS, Swagger
│   │   ├── urls.py             # API versioning (v1)
│   │   ├── exceptions.py       # Global error handler
│   │   └── responses.py        # Standardized response helpers
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Auth + Dashboard + Task CRUD
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml
```

---

## ⚡ Quick Start

### Option 1 — Docker (recommended)

```bash
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow

# Start all services (MongoDB + Django + React)
docker-compose up --build
```

- **API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **Swagger Docs**: http://localhost:8000/api/docs/

---

### Option 2 — Manual Setup

#### Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and SECRET_KEY

# 4. Run migrations
python manage.py makemigrations
python manage.py migrate

# 5. Create a superuser (admin)
python manage.py createsuperuser

# 6. Run dev server
python manage.py runserver
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Authentication API

All responses follow a standardized format:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": { ... }
}
```

### Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/register/` | Public | Register new user |
| POST | `/api/v1/auth/login/` | Public | Login, returns JWT tokens |
| POST | `/api/v1/auth/logout/` | Auth | Blacklist refresh token |
| POST | `/api/v1/auth/token/refresh/` | Public | Get new access token |
| GET/PATCH | `/api/v1/auth/profile/` | Auth | View/update own profile |
| POST | `/api/v1/auth/change-password/` | Auth | Change password |
| GET | `/api/v1/auth/admin/users/` | Admin | List all users |
| GET/PATCH/DELETE | `/api/v1/auth/admin/users/<id>/` | Admin | Manage user |

### Register
```bash
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "password": "Secure1234",
    "confirm_password": "Secure1234"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Secure1234"}'
```

---

## ✅ Tasks API

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/tasks/` | Auth | List tasks (own) / all (admin) |
| POST | `/api/v1/tasks/` | Auth | Create task |
| GET | `/api/v1/tasks/<id>/` | Owner/Admin | Get task |
| PATCH | `/api/v1/tasks/<id>/` | Owner/Admin | Update task |
| DELETE | `/api/v1/tasks/<id>/` | Owner/Admin | Delete task |
| GET | `/api/v1/tasks/stats/` | Auth | Task statistics |

### Query Parameters
- `?status=todo|in_progress|done` — filter by status
- `?priority=low|medium|high` — filter by priority
- `?search=keyword` — search title/description/tags
- `?ordering=-created_at` — sort results

### Create Task
```bash
curl -X POST http://localhost:8000/api/v1/tasks/ \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Finish assignment",
    "description": "Complete the backend internship task",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2025-12-31",
    "tags": ["internship", "backend"]
  }'
```

---

## 🗄 Database Schema

### Users Collection
```
_id, email (unique), username (unique), full_name,
role (user|admin), password (PBKDF2+SHA256),
is_active, is_staff, created_at, updated_at
```

### Tasks Collection
```
_id, user (FK → users), title, description,
status (todo|in_progress|done), priority (low|medium|high),
due_date, tags (array), created_at, updated_at
```

---

## 🛡 Security Practices

- **Password Hashing**: PBKDF2-SHA256 via Django's `set_password()`
- **JWT**: Short-lived access tokens (1h) + rotating refresh tokens (7d)
- **Token Blacklisting**: Logout invalidates refresh tokens
- **Input Validation**: DRF serializers + custom validators (regex, length, uniqueness)
- **Input Sanitization**: Tags stripped and capped at 30 chars, max 10
- **RBAC**: `IsAdmin` and `IsOwnerOrAdmin` custom permission classes
- **Role Protection**: Users cannot self-assign admin role via API
- **CORS**: Whitelist-only origins
- **Security Headers**: XSS filter, content type sniffing protection (production)

---

## 📖 API Documentation

Visit **http://localhost:8000/api/docs/** for interactive Swagger UI.

Alternative: **http://localhost:8000/api/redoc/** for ReDoc.

Download OpenAPI schema: **http://localhost:8000/api/schema.json**

---

## 📈 Scalability Notes

### Current Architecture
Single Django app + MongoDB — well-suited for MVP and moderate traffic.

### Scaling Path

**1. Horizontal Scaling**
- Stateless JWT auth enables multiple backend instances behind a load balancer (Nginx/AWS ALB)
- MongoDB Atlas supports sharding and replica sets

**2. Caching (Redis)**
```python
# Add to settings.py
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://localhost:6379/1",
    }
}
# Cache task stats, user profiles with @cache_page or cache.set()
```

**3. Microservices Extraction**
- Split `authentication` and `tasks` into separate Django services
- Add an API Gateway (Kong / AWS API Gateway)
- Use message queues (Celery + Redis) for async tasks (emails, notifications)

**4. Task Queue**
```python
# Celery for async: email notifications, report generation
@shared_task
def send_task_due_reminder(task_id):
    ...
```

**5. Deployment**
- **Docker Compose** → local dev
- **Kubernetes (K8s)** → production with auto-scaling pods
- **CI/CD**: GitHub Actions → Docker Hub → K8s

---

## 🧪 Testing

```bash
cd backend
python manage.py test apps.authentication apps.tasks
```

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (required) | Django secret key |
| `DEBUG` | `True` | Debug mode |
| `ALLOWED_HOSTS` | `*` | Comma-separated hosts |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DB_NAME` | `taskflow_db` | Database name |

---

## 👤 Author

Built for the **PrimeTrade Backend Developer Intern** assignment.

- **Stack**: Python + Django + MongoDB + React
- **Pattern**: REST API v1, RBAC, JWT Auth, Swagger Docs
- **Deploy**: Docker Compose ready
