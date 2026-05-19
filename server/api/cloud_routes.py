from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.cloud_services import get_all_cloud_accounts, add_new_cloud_account
from schemas.CloudAccounts_Schema import CreateNewCloudAccount

router = APIRouter(
    prefix="/cloud",
    tags = ["Link Cloud"]
)

@router.get("/{organization_id}",
    dependencies=[Depends(require_permission("cloud:read"))]
)
async def all_linked_Clouds(organization_id: str, db: AsyncSession = Depends(get_db)):
    return get_all_cloud_accounts(db=db, organization_id=organization_id)


@router.post("/create/{organization_id}/user/{userId}",
    dependencies=[Depends(require_permission("cloud:read"))]
)
async def all_linked_Clouds(organization_id: str, userId: str, data: CreateNewCloudAccount ,db: AsyncSession = Depends(get_db)):
    return add_new_cloud_account(db=db, organization_id=organization_id, user_id=userId, data=data)

