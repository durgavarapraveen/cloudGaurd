
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from datetime import datetime, timezone

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
from api.resource_relationship_route import router as resource_relationship_router
from api.iam_route import router as iam_router
from api.shallow_detector_route import router as shallow_detector_router
from api.security_analyzer_routes import router as security_analyzer_router
from api.github_auth_route import router as github_auth_router
from api.github_routes import router as github_router
from api.github_webhook_route import router as webhook_router
from integration.SSE.sse_route import router as sse_router

from db.postgressDB import engine, AsyncSessionLocal
from middlewares.userVerificationMiddleware import AuthMiddleware
from schedulars.scheduler_setup import start_scheduler, stop_scheduler



# ✅ Define lifespan BEFORE app
@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


# ✅ Single app definition with lifespan
app = FastAPI(lifespan=lifespan)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
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
app.include_router(resource_relationship_router)
app.include_router(iam_router)
app.include_router(shallow_detector_router)
app.include_router(security_analyzer_router)
app.include_router(github_auth_router)
app.include_router(github_router)
app.include_router(webhook_router)
app.include_router(sse_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to CloudGuard API!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

import json

@app.post("/webhooks/aws-events")
async def sns_webhook(request: Request):
    payload = await request.json()
    
    if payload.get("Type") != "Notification":
        return {"status": "ignored"}
    
    message = json.loads(payload["Message"])

    
    source = message["source"]
    if source != "aws.cloudshell":
        print(source)
    return {"status": "processed"}

@app.on_event("startup")
async def startup():
    # Start file watcher as background task
    asyncio.create_task(watch_files())
