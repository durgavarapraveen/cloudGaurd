from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db

from services.auth_service import (
    change_password as change_password_service,
    delete_user,
    forgot_password_service,
    login_user,
    logout_user,
    refresh_user_token,
    register_user,
    reset_password_service,
)

from schemas.user_schema import (
    CreateUserRequest,
    UserLoginRequest,
    RefreshTokenRequest
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

@router.post("/refresh-token")
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    return await refresh_user_token(data.refresh_token, db)

@router.post("/change_password/{userId}")
async def change_password(
    userId: str,
    newPassword: str,
    oldPassword: str,
    db: AsyncSession = Depends(get_db),
):
    return await change_password_service(userId=userId, db=db, Newpassword=newPassword, oldPassword=oldPassword)

@router.post("/forgot-password")
async def forgot_password(
    email: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    return await forgot_password_service(email=email, db=db, request=request, background_tasks=background_tasks)

@router.post("/reset-password")
async def reset_password(
    token: str,
    newPassword: str,
    db: AsyncSession = Depends(get_db),
):
    return await reset_password_service(token=token, db=db, new_password=newPassword)


