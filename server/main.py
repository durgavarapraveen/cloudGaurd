import os
from fastapi import FastAPI
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
from db.postgressDB import engine
from middlewares.userVerificationMiddleware import AuthMiddleware
from fastapi.middleware.cors import CORSMiddleware
from models.Base import Base


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
app.include_router(yaml_router)
app.include_router(user_router)
app.include_router(role_router)
app.include_router(permission_router)
app.include_router(dashboard_router)
app.include_router(rootUser_router)
app.include_router(organization_router)
app.include_router(cloudAccount_router)
app.include_router(resource_router)


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
