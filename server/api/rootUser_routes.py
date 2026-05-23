from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db

from schemas.rootUser_schema import CreateNewRootUserRequest, LoginRootUserRequest
from schemas.user_schema import RefreshTokenRequest
from schemas.organization_schema import CreateNewOrganization

from services.rootUser_service import login_rootUser, create_rootUser, refresh_user_token, login_rootUser_Organization_Service, get_all_organizations_service, create_new_user, createNewOrganizationService, get_all_users_service, deleteUser

from schemas.user_schema import CreateUserByRootUser

from middlewares.userPermissions import require_permission

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


#------------------------------
@router.get("/organizations/{userId}")
async def get_all_organizations(
    userId: str,
    db:AsyncSession = Depends(get_db)
):
    return await get_all_organizations_service(db=db, userId=userId)

@router.post("/create", dependencies=[Depends(require_permission("users:create"))])
async def createUser(
    data: CreateUserByRootUser,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await create_new_user(db=db, data=data, request=request)

@router.post("/create/organization/{userId}", dependencies=[Depends(require_permission("users:create"))])
async def createOrganization(
    request: Request,
    data: CreateNewOrganization,
    userId: str,
    db: AsyncSession = Depends(get_db)
):
    return await createNewOrganizationService(db=db, data=data,userId=userId, request=request)

@router.get("/allUsers/{organizationId}")
async def get_all_users(
    organizationId: str,
    db:AsyncSession = Depends(get_db)
):
    return await get_all_users_service(db=db, organizationId=organizationId)

@router.delete("/delete/{userId}")
async def get_all_users(
    userId: str,
    db:AsyncSession = Depends(get_db)
):
    return await deleteUser(db=db, userId=userId)
