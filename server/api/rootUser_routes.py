import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db

from schemas.rootUser_schema import CreateNewRootUserRequest, LoginRootUserRequest
from schemas.user_schema import RefreshTokenRequest
from schemas.organization_schema import CreateNewOrganization

from services.rootUser_service import login_rootUser, create_rootUser, refresh_user_token, login_rootUser_Organization_Service, get_all_organizations_service, create_new_user, createNewOrganizationService, get_all_users_service, deleteUser

from schemas.user_schema import CreateUserByRootUser, RootUserPublic, UserPublic

from middlewares.userPermissions import require_permission, require_root_user

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
@router.get(
    "/organizations/{userId}",
    dependencies=[Depends(require_root_user())],
    response_model=RootUserPublic,
)
async def get_all_organizations(
    userId: uuid.UUID,
    db:AsyncSession = Depends(get_db)
):
    return await get_all_organizations_service(db=db, userId=str(userId))

@router.post(
    "/create",
    dependencies=[Depends(require_permission("users:create"))],
    response_model=UserPublic,
)
async def createUser(
    data: CreateUserByRootUser,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    return await create_new_user(
        db=db,
        data=data,
        request=request,
        background_tasks=background_tasks,
    )

@router.post("/create/organization/{userId}", dependencies=[Depends(require_root_user())])
async def createOrganization(
    request: Request,
    data: CreateNewOrganization,
    userId: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await createNewOrganizationService(db=db, data=data,userId=str(userId), request=request)

@router.get(
    "/allUsers/{organizationId}",
    dependencies=[Depends(require_root_user())],
    response_model=list[UserPublic],
)
async def get_all_users(
    organizationId: uuid.UUID,
    db:AsyncSession = Depends(get_db)
):
    return await get_all_users_service(db=db, organizationId=organizationId)

@router.delete(
    "/delete/{userId}",
    dependencies=[Depends(require_root_user())],
)
async def delete_user_by_root(
    userId: uuid.UUID,
    db:AsyncSession = Depends(get_db)
):
    return await deleteUser(db=db, userId=str(userId))
