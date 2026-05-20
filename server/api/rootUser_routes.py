from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db

from schemas.rootUser_schema import CreateNewRootUserRequest, LoginRootUserRequest
from schemas.user_schema import RefreshTokenRequest

from services.rootUser_service import login_rootUser, create_rootUser, refresh_user_token, login_rootUser_Organization_Service


router = APIRouter(
    prefix="/root_user",
    tags=["Root User"]
)

@router.post("/register")
async def register(
    data: CreateNewRootUserRequest,
    db: AsyncSession = Depends(get_db)
):
    user = await create_rootUser(db, data)
    return {
        "message": "User created successfully",
        "user": str(user.username)
    }
    
@router.post("/login")
async def Login(
    data: LoginRootUserRequest,
    db: AsyncSession = Depends(get_db)
):
    return await login_rootUser(db, data)


@router.post("/refresh-token")
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    return await refresh_user_token(data.refresh_token, db)

@router.post("/login/{organizationID}")
async def Login_Organization(
    data: LoginRootUserRequest,
    organizationID: str,
    db: AsyncSession = Depends(get_db)
):
    return await login_rootUser_Organization_Service(db, data, organizationID)