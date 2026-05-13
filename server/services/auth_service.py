from datetime import datetime, timezone
from os import urandom

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from auth.password import hash_password, verify_password
from auth.jwt_handler import checkRefreshTokenValidity, create_access_token, create_refresh_token

from models.rolesModel import Role

from repository.user_repository import (
    get_user_by_email,
    create_user,
)

from models.userModel import User

from schemas.user_schema import (
    CreateUserRequest,
    UserLoginRequest
)

import os
from dotenv import load_dotenv

load_dotenv()

secret_key = os.getenv("JWT_SECRET_KEY")


async def register_user(db: AsyncSession, data: CreateUserRequest):
    existing_user = await get_user_by_email(db, data.email)

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
     # ✅ fetch default role
    result = await db.execute(select(Role).where(Role.name == "user"))
    default_role = result.scalar_one_or_none()

    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(data.password),
        is_active=True,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    if default_role:
        user.role.append(default_role)

    return await create_user(db, user)


async def login_user(db: AsyncSession, data: UserLoginRequest):
    result = await db.execute(
        select(User)
        .where(User.email == data.email)
        .options(
            selectinload(User.roles).selectinload(Role.permissions)  # ✅ chain load
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # ✅ both roles and permissions already loaded
    permissions = []
    for role in user.roles:
        for perm in role.permissions:
            permissions.append(perm.name)

    access_token = create_access_token(user.id, permissions, secret_key)
    refresh_token = create_refresh_token(user.id, secret_key)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user_id": str(user.id),
        "permissions": permissions,  # ✅ useful to return for frontend
        "message": "Login successful"
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
    
    #check refresh token validity here (not implemented in this snippet)
    user_id = checkRefreshTokenValidity(refresh_token, secret_key)
    
    
    user = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.roles).selectinload(Role.permissions)  # ✅ chain load
        )
    )
    
    users = user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    permissions = []
    
    for role in users.roles:
        for perm in role.permissions:
            permissions.append(perm.name)

    new_access_token = create_access_token(str(user.id), permissions, secret_key)
    new_refresh_token = create_refresh_token(str(user.id), secret_key)
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "message": "Token refreshed successfully"
    }
    
    
async def register_user_by_admin(db: AsyncSession, data: CreateUserRequest):
    existing_user = await get_user_by_email(db, data.email)

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
     # ✅ fetch default role
    result = await db.execute(select(Role).where(Role.name == "user"))
    default_role = result.scalar_one_or_none()
    
    password = urandom(8)
    
    role_result = await db.execute(
        select(Role).where(Role.name.in_(data.roles))
    )
    role_objects = role_result.scalars().all()

    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(password),
        is_active=True,
        created_at=datetime.now(timezone.utc).isoformat(),
        roles = role_objects
    )
    

    return await create_user(db, user)