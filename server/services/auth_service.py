from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from auth.password import hash_password, verify_password
from auth.jwt_handler import create_access_token, create_refresh_token

from repository.user_repository import (
    get_user_by_email,
    create_user,
    logout_user
)

from models.userModel import User

from schemas.user_schema import (
    CreateUserRequest,
    UserLoginRequest
)

import os
from dotenv import load_dotenv

load_dotenv()

secret_key = os.getenv("SECRET_KEY")

async def register_user(
    db: AsyncSession,
    data: CreateUserRequest
):

    existing_user = await get_user_by_email(
        db,
        data.email
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(data.password),
        permissions=data.permissions,
        is_active=True,
        created_at=datetime.now(timezone.utc).isoformat()
    )

    return await create_user(db, user)

async def login_user(
    db: AsyncSession,
    data: UserLoginRequest
):
    user = await get_user_by_email(
        db,
        data.email
    )

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    if not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )
    
    permissions = user.permissions if user.permissions else []
        
    # create access and refesh tokens here and return them to the user
    access_token =  create_access_token(user.id, permissions, secret_key)
    refresh_token = create_refresh_token(user.id, secret_key)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
        "message": "Login successful"
    }
    
    
async def delete_user(
    db: AsyncSession,
    user_id: str
):
    return await delete_user(db, user_id)

async def logout_user(
    db: AsyncSession,
    user_id: str
):
    return logout_user(user_id, db)

async def refresh_user_token(
    user_id: str,
    db: AsyncSession
):
    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    permissions = user.permissions if user.permissions else []

    new_access_token = create_access_token(user_id, permissions, secret_key)

    return {
        "access_token": new_access_token,
        "message": "Token refreshed successfully"
    }