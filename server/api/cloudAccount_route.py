from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from schemas.CloudAccounts_Schema import CreateNewCloudAccount

router = APIRouter(
    prefix="/cloud_accounts",
    tags=["Cloud Accounts"]
)

from services.cloudAccounts_service import (
    createNewCloudAccount_Service,
    getCloudAccountwithID,
    getAllCloudAccount_Service,
    deleteCloudAccount_Service
)

@router.post("/create", 
    dependencies=[Depends(require_permission("cloudAccount:create"))]
)
async def create_new_cloud_account(
    data: CreateNewCloudAccount,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await createNewCloudAccount_Service(db, data, request)

# @router.get("", dependencies=[Depends(require_permission("users:read"))])
@router.get("", 
    dependencies=[Depends(require_permission("cloudAccount:read"))]
)
async def get_all_cloud_accounts(request: Request,db: AsyncSession = Depends(get_db)):
    return await getAllCloudAccount_Service(db, request=request)

@router.get("/{id}", 
    dependencies=[Depends(require_permission("cloudAccount:read"))]
)
async def get_all_cloud_account_with_ID(request: Request, id: str, db: AsyncSession = Depends(get_db)):
    return await getCloudAccountwithID(db, id, request=request)

@router.delete("/{id}", 
    dependencies=[Depends(require_permission("cloudAccount:delete"))]
)
async def delete_cloud_account(request: Request, id: str, db: AsyncSession = Depends(get_db)):
    return await deleteCloudAccount_Service(db, id, request=request)
