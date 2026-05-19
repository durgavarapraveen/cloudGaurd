import os
from fastapi import FastAPI
from api.aws_routes import router as aws_router
from api.aws_policy_loader import router as aws_policy_router
from api.azure_policy_loader import router as azure_policy_router
from api.aws_checker_routes import router as aws_checker_router
from api.aws_scanner_route import router as aws_scanner_router
from api.yaml import router as yaml_router
from api.auth_routes import router as auth_router
from api.users_routes import router as user_router
from api.roles_routes import router as role_router
from api.permission_route import router as permission_router
from api.dashboard_routes import router as dashboard_router
from db.postgressDB import engine
from middlewares.userVerificationMiddleware import AuthMiddleware
from fastapi.middleware.cors import CORSMiddleware
from models.Base import Base

from models.userModel import User
from models.rolesModel import Role
from models.permission import Permission
from models.accounts_model import Accounts
from models.scans_model import Scans
from models.findings import Findings
from models.resources_model import Resources

app = FastAPI()

print(__file__)

# 1. Middlewares after
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

# 2. Routers first
app.include_router(auth_router)
app.include_router(aws_router)
app.include_router(aws_policy_router)
app.include_router(azure_policy_router)
app.include_router(aws_checker_router)
app.include_router(aws_scanner_router)
app.include_router(yaml_router)
app.include_router(user_router)
app.include_router(role_router)
app.include_router(permission_router)
app.include_router(dashboard_router)


# 3. Root route
@app.get("/")
def read_root():
    return {"message": "Welcome to CloudGuard API!"}

# 4. Startup event
@app.on_event("startup")
async def startup():
    try:
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("PostgreSQL connected successfully")
    except Exception as e:
        print("Database connection failed")
        print(e)
