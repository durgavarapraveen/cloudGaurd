from datetime import datetime, timezone

from fastapi import BackgroundTasks, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
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

from auth.password import generate_temp_password, hash_password, verify_password

from services.mail_service import (
    build_tenant_login_url,
    send_admin_created_account_email,
)

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


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}

async def create_rootUser(db: AsyncSession, data: CreateNewRootUserRequest):

    # Bootstrap only. This endpoint is unauthenticated so the very first
    # operator can be created on a fresh deployment; once one exists it is
    # closed, otherwise anyone who can reach the API could grant themselves
    # platform-wide access. Set ALLOW_ROOT_REGISTRATION=true to reopen it.
    existing_count = await db.scalar(select(func.count()).select_from(RootUsers))

    if existing_count and not _bool_env("ALLOW_ROOT_REGISTRATION"):
        raise HTTPException(
            status_code=403,
            detail=(
                "Root registration is closed. A platform operator already "
                "exists."
            ),
        )

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

async def create_new_user(
    request: Request,
    data: CreateUserByRootUser,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
):
    existing_user = await get_user_by_email(db, data.email, request)

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    organization = await CheckOrganizationwithID(db, str(data.organizationId))

    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    password = generate_temp_password()

    # Scope the lookup to this organization. Without the organization filter a
    # role row belonging to another tenant would be attached to this user.
    checkRole = await db.execute(
        select(Role)
        .where(
            Role.name == "rootUserOrg",
            Role.organization_id == data.organizationId,
        )
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

    send_admin_created_account_email(
        background_tasks=background_tasks,
        email_to=user.email,
        username=user.username,
        temp_password=password,
        admin_name="CloudGuard Admin",
        created_at=datetime.now(timezone.utc).strftime("%b %d, %Y at %I:%M %p UTC"),
        roles=[role.name],
        login_url=build_tenant_login_url(organization.slug),
    )

    return user


async def createNewOrganizationService(db: AsyncSession, data: CreateNewOrganization,userId:str, request: Request): 
    userID = uuid.UUID(str(userId))
    
    existingOrganization = await CheckOrganization(db, data.name)
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
    
    
    