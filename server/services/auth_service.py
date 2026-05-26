from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
import hashlib


from auth.password import hash_password, verify_password
from auth.jwt_handler import checkRefreshTokenValidity, create_access_token, create_refresh_token, generate_reset_token

from repository.user_repository import (
    get_user_by_email,
    create_user,
)
from repository.organization_repository import CheckOrganizationwithID

from models.userModel import User
from models.groups_Model import UserGroups
from models.rolesModel import Role
from models.passwordResetToken_model import PasswordResetToken

from schemas.user_schema import (
    CreateUserRequest,
    UserLoginRequest
)

import os
from os import urandom
from pathlib import Path
from dotenv import load_dotenv
from cache.user_permissions_cache import permissions_cache


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

secret_key = os.getenv("JWT_SECRET_KEY")

from .mail_service import (
    send_admin_created_account_email,
    send_forgot_password_email
)


async def register_user(db: AsyncSession, data: CreateUserRequest):
    existing_user = await get_user_by_email(db, data.email)

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    result = await db.execute(select(Role).where(Role.name == "user"))
    default_role = result.scalar_one_or_none()

    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(data.password),
        is_active=True,
        organization_id=data.organizationId
    )
    
    if default_role:
        user.roles.append(default_role)

    return await create_user(db, user)


async def login_user(db: AsyncSession, data: UserLoginRequest):
    result = await db.execute(
        select(User)
        .where(User.email == data.email)
        .options(
            selectinload(User.roles)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    root_user = False
    print("User Roles:", [role.name for role in user.roles])  # Debugging line
    for role in user.roles:
        if role.name == "rootUserOrg":
            root_user = True
            break
        

    access_token = create_access_token(user.id, user.organization_id, secret_key, root_user)
    refresh_token = create_refresh_token(user.id, secret_key)
    

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user_id": str(user.id),
        "message": "Login successful",
    }

async def delete_user(db: AsyncSession, user_id: str):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully"}


async def logout_user(db: AsyncSession, user_id: str):  # ✅ fixed arg order
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return {"message": "Logged out successfully"}


async def refresh_user_token(refresh_token: str, db: AsyncSession):
    print("ENtered")
    try:
        user_id = checkRefreshTokenValidity(refresh_token, secret_key)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    
    user = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.roles)
        )
    )
    
    user = user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    root_user = False
    for role in user.roles:
        if role.name == "rootUserOrg":
            root_user = True
            break
    
    permissions = []
    
    for role in user.roles:
        for perm in role.permissions:
            permissions.append(perm.name)

    new_access_token = create_access_token(str(user.id), str(user.organization_id), secret_key, root_user )
    new_refresh_token = create_refresh_token(str(user.id), secret_key)
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "user_id": str(user.id),
        "permissions": permissions,
        "message": "Token refreshed successfully"
    }
    
    
async def register_user_by_admin(db: AsyncSession, data: CreateUserRequest, request: Request, background_tasks: BackgroundTasks):
    organization_id = request.state.organizationId
    existing_user = await get_user_by_email(db, data.email, request)
    organization = await CheckOrganizationwithID(db, organization_id)
    slug = organization.slug
    login_urls = f"{slug}.{os.getenv('FRONT_END_URL')}/login"

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    password = urandom(8)
    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(password),
        is_active=True,
        organization_id=organization_id
    )
    
    send_admin_created_account_email(
        admin_name="CloudGaurd Admin",
        background_tasks= background_tasks,
        email_to=user.email,
        created_at=datetime.utcnow().strftime("%b %d, %Y at %I:%M %p UTC"),
        temp_password=password,
        login_url=login_urls,
        username=data.username,
        roles=[],
    )
    
    return await create_user(db, user)


async def get_user_permissions(db: AsyncSession, user_id: str): 
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.groups).selectinload(UserGroups.permissions)         
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        return []
    permissions = set()
    for role in user.roles:
        for perm in role.permissions:
            permissions.add(perm.name)
    for group in user.groups:
        for perm in group.permissions:
            permissions.add(perm.name)
    permissions_list = list(permissions)
    permissions_cache[user_id] = permissions_list
    return permissions_list

async def change_password(db: AsyncSession, userId: str, Newpassword: str, oldPassword: str):
    result = await db.execute(
        select(User)
        .where(User.id == userId)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="No User Found")
    
    if not verify_password(user.password, oldPassword):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    hashPassword = hash_password(Newpassword)
    user.password = hashPassword
    await db.commit()
    return {
        "message": "Password updated Successful"
    }
    
async def forgot_password_service(db: AsyncSession, email: str, background_tasks: BackgroundTasks, request=Request):
    user = await get_user_by_email(db, email)
    organization_id = request.state.organizationId
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}
    
    token = generate_reset_token()          # your token logic
    expires = datetime.utcnow() + timedelta(minutes=30)
    
    restToken = PasswordResetToken(
        user_id=user.email,
        token_hash = hashlib.sha256(token.encode()).hexdigest(),
        expires_at=expires,
        used=False
    )
    
    db.add(restToken)
    await db.commit()
    
    organization = await CheckOrganizationwithID(db, organization_id)
    slug = organization.slug
    
    send_forgot_password_email(
        background_tasks=background_tasks,
        email_to=user.email,
        username=user.username,
        reset_token=token,
        reset_url=f"{slug}.{os.getenv('FRONT_END_URL')}/reset-password?token={token}",
        expires_in="30 minutes",
        expires_at=expires.strftime("%b %d, %Y at %I:%M %p UTC"),
        requested_at=datetime.utcnow().strftime("%b %d, %Y at %I:%M %p UTC"),
        request_ip=request.client.host,
    )

    return {"message": "If that email exists, a reset link has been sent."}

async def reset_password_service(
    db: AsyncSession,
    token: str,
    new_password: str,
):
    # Hash incoming token
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    # Find token in DB
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash
        )
    )

    reset_record = result.scalar_one_or_none()

    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    # Check already used
    if reset_record.used:
        raise HTTPException(
            status_code=400,
            detail="Reset token already used"
        )

    # Check expiration
    if reset_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Reset token expired"
        )

    # Get user
    user_result = await db.execute(
        select(User).where(User.id == reset_record.user_id)
    )

    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Update password
    user.password = hash_password(new_password)

    # Mark token used
    reset_record.used = True

    await db.commit()

    return {
        "message": "Password reset successfully"
    }
    
    



