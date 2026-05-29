import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

from db.postgressDB import engine, AsyncSessionLocal
from middlewares.userVerificationMiddleware import AuthMiddleware
from models.Base import Base
from models.resourceSchedular_model import ResourceSchedular
from schedulars.schedular import scheduler
from schedulars.resourceSchedular_job import run_scheduler_job  # ✅ async function
from apscheduler.triggers.interval import IntervalTrigger
from services.resourceSchedular_service import get_next_start_date, get_scheduled_time_today


# ✅ Define lifespan BEFORE app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("PostgreSQL connected successfully")
    except Exception as e:
        print(f"Database connection failed: {e}")

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
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

@app.get("/")
def read_root():
    return {"message": "Welcome to CloudGuard API!"}
