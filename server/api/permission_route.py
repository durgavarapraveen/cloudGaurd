from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession


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

@router.get(
    "",
    dependencies=[Depends(require_permission("permissions:read"))],
    include_in_schema=False,
)
@router.get("/", 
    dependencies=[Depends(require_permission("permissions:read"))]
)
async def getAllPermissions( request: Request, db: AsyncSession = Depends(get_db)):
    return await get_all_permissions(db, request=request)

@router.post("/create",
             dependencies=[Depends(require_permission("permissions:write"))]
            )
async def createPermission(
    data: CreatePermissionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await add_permission(db, permission_name=data.permission_name, request=request)

@router.delete("/delete/{id}", 
    dependencies=[Depends(require_permission("permissions:delete"))]
)
async def deletePermission(
    id: str,
    db: AsyncSession = Depends(get_db)   
):
    return await delete_permission_by_id(db, id=id)
