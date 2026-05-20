from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.cloud_services import get_all_cloud_accounts, add_new_cloud_account
from schemas.CloudAccounts_Schema import CreateNewCloudAccount

router = APIRouter(
    prefix="/cloud",
    tags = ["Link Cloud"]
)

@router.get("",
    dependencies=[Depends(require_permission("cloud:read"))],
    include_in_schema=False,
)
@router.get("/",
    dependencies=[Depends(require_permission("cloud:read"))]
)
async def all_linked_clouds(db: AsyncSession = Depends(get_db)):
    return await get_all_cloud_accounts(db=db)


@router.get("/{organization_id}",
    dependencies=[Depends(require_permission("cloud:read"))]
)
async def all_linked_clouds_by_organization(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
):
    return await get_all_cloud_accounts(db=db)


@router.post("/create/{organization_id}/user/{userId}",
    dependencies=[Depends(require_permission("cloud:read"))]
)
async def create_linked_cloud(
    organization_id: str,
    userId: str,
    data: CreateNewCloudAccount,
    db: AsyncSession = Depends(get_db),
):
    return await add_new_cloud_account(
        db=db,
        user_id=userId,
        data=data,
    )

