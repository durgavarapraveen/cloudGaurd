from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from psycopg2 import IntegrityError
import uuid

from schemas.rootUser_schema import CreateNewRootUserRequest, LoginRootUserRequest
from schemas.user_schema import CreateUserByRootUser
from schemas.organization_schema import CreateNewOrganization

from repository.rootUser_repository import (
    create_rootUser as create_rootUser_record,
    get_rootUser_username,
)
from repository.organization_repository import (
    createOrganization,
    CheckOrganization
)

from models.rootUser_model import RootUsers
from models.userModel import User
from models.orginization_model import Organization
from models.rolesModel import Role

from auth.password import hash_password, verify_password

from auth.rootUser_jwt import create_access_token, create_refresh_token, checkRefreshTokenValidity

from repository.organization_repository import CheckOrganizationwithID
from repository.user_repository import get_user_by_email

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
    
    
# fetch all organizations
async def get_all_organizations_service(db: AsyncSession, userId: str):
    user = await db.execute(
        select(RootUsers)
        .where(RootUsers.id == userId)
        .options(selectinload(RootUsers.organization))
    )
    
    user = user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="No user Found")
    
    return user

async def create_new_user(request: Request, data: CreateUserByRootUser,db: AsyncSession):
    existing_user = await get_user_by_email(db, data.email, request)

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    password = "12345678"
    
    checkRole = await db.execute(
        select(Role)
        .where(Role.name == "rootUserOrg")
    )
    
    checkRole = checkRole.scalar_one_or_none()

    if checkRole:
        role = checkRole
    else:
        new_role = Role(
            name="rootUserOrg",
            organization_id=data.organizationId
        )
        db.add(new_role)
        await db.flush()
        role = new_role 

    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(password),
        is_active=True,
        organization_id=data.organizationId,
        roles=[role]
    )
    
    try:
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    return user


async def createNewOrganizationService(db: AsyncSession, data: CreateNewOrganization,userId:str, request: Request): 
    userID = uuid.UUID(str(userId))
    
    existingOrganization = await CheckOrganization(db, data.name)
    print(existingOrganization)
    if existingOrganization:
        raise HTTPException(status_code=400, detail="Organization with this Name Exists")
    organization = Organization(
        name=data.name,
        slug=data.slug,
        description=data.description,
        owner_id=userID,
    )
    return await createOrganization(db, organization)


async def get_all_users_service(db: AsyncSession, organizationId: str):
    users = await db.execute(
        select(User)
        .where(User.organization_id == organizationId)
    )
    users = users.scalars().all()
    print(users)
    return users

async def deleteUser(db: AsyncSession, userId: str):
    user = await db.execute(
        select(User)
        .where(User.id == uuid.UUID(userId))
    )
    
    user = user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="No User Found")
    
    await db.delete(user)
    await db.commit()
    return {
        "message": "User get deleted"
    }
    
    
    