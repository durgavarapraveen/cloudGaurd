from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from schemas.rootUser_schema import CreateNewRootUserRequest, LoginRootUserRequest

from repository.rootUser_repository import (
    create_rootUser as create_rootUser_record,
    get_rootUser_username,
)

from models.rootUser_model import RootUsers

from auth.password import hash_password, verify_password

from auth.rootUser_jwt import create_access_token, create_refresh_token, checkRefreshTokenValidity

from repository.organization_repository import CheckOrganizationwithID

from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

secret_key = os.getenv("JWT_SECRET_KEY")

async def create_rootUser(db: AsyncSession, data: CreateNewRootUserRequest):
    
    existing_user = await get_rootUser_username(db, data.username)
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = RootUsers(
        username=data.username,
        password=hash_password(data.password),
        role=data.role
    )
    
    return await create_rootUser_record(db, user)

async def login_rootUser(db: AsyncSession, data: LoginRootUserRequest):
    existing_user = await get_rootUser_username(db, data.username)
    
    if not existing_user:
        raise HTTPException(status_code=400, detail="Username does not exists")
    
    if not verify_password(data.password, existing_user.password):
        raise HTTPException(status_code=400, detail="Invalid password")
    
    access_token = create_access_token(existing_user.id, secret_key)
    refresh_token = create_refresh_token(existing_user.id, secret_key)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user_id": str(existing_user.id),
        "message": "Login successful"
    }
    
async def login_rootUser_Organization_Service(db: AsyncSession, data: LoginRootUserRequest, organizationID: str):
    existing_user = await get_rootUser_username(db, data.username)
    
    if not existing_user:
        raise HTTPException(status_code=400, detail="Username does not exists")
    
    if not verify_password(data.password, existing_user.password):
        raise HTTPException(status_code=400, detail="Invalid password")
    
    access_token = create_access_token(existing_user.id, secret_key)
    refresh_token = create_refresh_token(existing_user.id, secret_key)
    
    organization = await CheckOrganizationwithID(db, organizationID)
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user_id": str(existing_user.id),
        "permissions": [],
        "slug": organization.slug,
        "message": "Login successful"
    }
    
async def refresh_user_token(refresh_token: str, db: AsyncSession):
    try:
        user = checkRefreshTokenValidity(refresh_token, secret_key)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    
    user = await db.get(RootUsers, user)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_access_token = create_access_token(str(user.id), secret_key)
    new_refresh_token = create_refresh_token(str(user.id), secret_key)
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "user_id": str(user.id),
        "permissions": [],
        "message": "Token refreshed successfully"
    }
    
    
