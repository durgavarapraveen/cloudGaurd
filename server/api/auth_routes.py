from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db

from services.auth_service import (register_user, login_user, delete_user, logout_user, refresh_user_token)

from schemas.user_schema import (
    CreateUserRequest,
    UserLoginRequest
)
from middlewares.userPermissions import require_permission

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post("/register")
async def register(
    data: CreateUserRequest,
    db: AsyncSession = Depends(get_db)
):

    user = await register_user(db, data)

    return {
        "message": "User created successfully",
        "user_id": str(user.id)
    }
    
@router.post("/login")
async def login(
    data: UserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    return await login_user(db, data)

@router.put("/logout/{user_id}")
async def logout(
    user_id: str,
    db: AsyncSession = Depends(get_db)
): 
    return await logout_user(db, user_id)

@router.delete("/delete/{user_id}")
async def deleteUser(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await delete_user(db, user_id)

@router.post("/refresh-token/{user_id}")
async def refresh_token(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await refresh_user_token(db, user_id)