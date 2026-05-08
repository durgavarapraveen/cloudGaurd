from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.permissions_service import (
    delete_permission_by_id,
    get_all_permissions,
    add_permission,
    
)

class CreatePermissionRequest(BaseModel):
    permission_name: str

router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"]
)

@router.get("/", 
            dependencies=[Depends(require_permission("permissions:read"))]
            )
async def getAllPermissions(db: AsyncSession = Depends(get_db)):
    return await get_all_permissions(db)

@router.post("/create")
async def createPermission(
    data: CreatePermissionRequest,
    db: AsyncSession = Depends(get_db)
):
    return await add_permission(db, permission_name=data.permission_name)

@router.delete("/delete/{id}", 
               dependencies=[Depends(require_permission("permissions:delete"))]
               )
async def deletePermission(
    id: str,
    db: AsyncSession = Depends(get_db)   
):
    return await delete_permission_by_id(db, id=id)