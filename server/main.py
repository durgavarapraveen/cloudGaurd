import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError, IntegrityError, SQLAlchemyError
from sqlalchemy import select
from datetime import datetime, timezone
from apscheduler.triggers.date import DateTrigger

from api.yaml import router as yaml_router
from api.auth_routes import router as auth_router
from api.users_routes import router as user_router
from api.roles_routes import router as role_router
from api.permission_route import router as permission_router
from api.dashboard_routes import router as dashboard_router
from api.rootUser_routes import router as rootUser_router
from api.organization_routes import router as organization_router
from api.cloudAccount_route import router as cloudAccount_router
from api.resources_route import router as resource_router
from api.resourceSchedular_route import router as resourceSchedular_router
from api.group_route import router as group_router
from api.drift_routes import router as drift_router

from auth.secrets_box import encryption_configured
from db.postgressDB import engine, AsyncSessionLocal
from middlewares.userVerificationMiddleware import AuthMiddleware
from models.Base import Base
from models.resourceSchedular_model import ResourceSchedular
from schedulars.schedular import scheduler
from schedulars.resourceSchedular_job import run_scheduler_job  # ✅ async function
from apscheduler.triggers.interval import IntervalTrigger
from services.resourceSchedular_service import get_next_start_date, get_scheduled_time_today


logger = logging.getLogger(__name__)

# Origins allowed to call the API from a browser. Tenants are served from
# subdomains, so a plain allowlist of "localhost:3000" cannot cover
# "acme.localhost:3000" - the regex below matches any tenant label.
DEFAULT_CORS_ORIGIN_REGEX = (
    r"^https?://([A-Za-z0-9-]+\.)*(localhost|127\.0\.0\.1)(:\d+)?$"
)

# Read with `or`, not a getenv default: Compose passes the variable through as
# an empty string when it is unset, and an empty pattern matches every origin,
# which would allow CORS from anywhere.
CORS_ORIGIN_REGEX = (
    os.getenv("CORS_ALLOW_ORIGIN_REGEX", "").strip() or DEFAULT_CORS_ORIGIN_REGEX
)


def _validate_configuration() -> None:
    """Refuse to start with a configuration that is unsafe or unusable."""
    secret = os.getenv("JWT_SECRET_KEY", "")

    if not secret.strip():
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Every token would be signed with an "
            "empty key and could be forged. Generate one with: "
            "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )

    if len(secret) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY is too short. Use at least 32 characters."
        )

    if not os.getenv("DATABASE_URL", "").strip():
        raise RuntimeError(
            "DATABASE_URL is not set. Example: "
            "postgresql+asyncpg://admin:<password>@postgres:5432/cloudguard"
        )

    if not encryption_configured():
        logger.warning(
            "CREDENTIALS_ENCRYPTION_KEY is not set. Cloud credentials cannot "
            "be encrypted at rest. Generate one with: python -c "
            "\"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )


# ✅ Define lifespan BEFORE app
@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_configuration()

    # Create tables. A failure here means every request would fail, so the
    # application refuses to start rather than serving a broken instance.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL connected successfully")
    except Exception as exc:
        logger.critical("Database connection failed: %s", exc)
        raise RuntimeError(
            "Cannot start CloudGuard: the database is unreachable. "
            "Check DATABASE_URL."
        ) from exc

    # Start scheduler
    scheduler.start()

    # Reload active schedulers from DB
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ResourceSchedular).where(ResourceSchedular.is_active == True)
        )
        active_schedulers = result.scalars().all()
        now = datetime.now(timezone.utc)

        for s in active_schedulers:
            if s.stop_date and now > s.stop_date:
                s.is_active = False
                continue

            scheduler.add_job(
                run_scheduler_job,          # ✅ async function, AsyncIOScheduler handles it
                trigger=IntervalTrigger(
                    hours=s.frequency,      # ✅ hours not days (your model uses hours)
                    start_date=get_next_start_date(s.fetch_time),
                    end_date=s.stop_date,
                    timezone=timezone.utc,
                ),
                id=str(s.id),
                args=[str(s.id)],
                replace_existing=True,
            )

            scheduled_today = get_scheduled_time_today(s.fetch_time)
            last_scan = s.last_scan
            missed_today = scheduled_today <= now and (
                last_scan is None or last_scan < scheduled_today
            )
            if missed_today:
                scheduler.add_job(
                    run_scheduler_job,
                    trigger=DateTrigger(run_date=now, timezone=timezone.utc),
                    id=f"{s.id}:catchup",
                    args=[str(s.id)],
                    replace_existing=True,
                )

        await db.commit()

    yield  # app runs here

    scheduler.shutdown()


# ✅ Single app definition with lifespan
app = FastAPI(lifespan=lifespan)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthMiddleware)

# Routers
app.include_router(auth_router)
app.include_router(yaml_router)
app.include_router(user_router)
app.include_router(role_router)
app.include_router(permission_router)
app.include_router(dashboard_router)
app.include_router(rootUser_router)
app.include_router(organization_router)
app.include_router(cloudAccount_router)
app.include_router(resource_router)
app.include_router(resourceSchedular_router)
app.include_router(group_router)
app.include_router(drift_router)

# ──────────────────────────────────────────────────────────────
#  Exception handlers
#
#  Without these, a malformed UUID path parameter or a unique-constraint
#  violation reaches the client as HTTP 500 with a stack trace in the logs.
# ──────────────────────────────────────────────────────────────


@app.exception_handler(IntegrityError)
async def handle_integrity_error(request: Request, exc: IntegrityError):
    logger.warning("Integrity error on %s %s", request.method, request.url.path)

    return JSONResponse(
        status_code=409,
        content={"detail": "That record conflicts with one that already exists"},
    )


@app.exception_handler(DataError)
async def handle_data_error(request: Request, exc: DataError):
    logger.warning("Invalid data on %s %s", request.method, request.url.path)

    return JSONResponse(
        status_code=400,
        content={"detail": "One of the supplied values has the wrong format"},
    )


@app.exception_handler(SQLAlchemyError)
async def handle_database_error(request: Request, exc: SQLAlchemyError):
    # Log the detail for operators; never return driver internals to callers.
    logger.exception("Database error on %s %s", request.method, request.url.path)

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
def read_root():
    return {"message": "Welcome to CloudGuard API!"}
