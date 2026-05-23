from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db
from schemas.roles_schema import CreateRoleRequest


from services.roles_service import (
    get_all_roles,
    get_role_by_id,
    get_role_by_name,
    delete_role,
    edit_role_permissions,
    create_role
)

router = APIRouter(
    prefix="/roles",
    tags=["Roles"]
)

class RolePermissionUpdateRequest(BaseModel):
    permissions: List[str]
    name: str

@router.get(
    "",
    dependencies=[Depends(require_permission("roles:read"))],
    include_in_schema=False,
)
@router.get("/", 
    dependencies=[Depends(require_permission("roles:read"))]
)  
async def getAllRoles(request:Request, db: AsyncSession = Depends(get_db)):
    return await get_all_roles(db=db, request=request)

@router.post("/create", 
    dependencies=[Depends(require_permission("roles:write"))]
)
async def CreateNewRole(
    role_data: CreateRoleRequest,
    request:Request,
    db: AsyncSession = Depends(get_db)   
):
    return await create_role(db, role_data,request=request)

@router.get("/id/{id}", dependencies=[Depends(require_permission("roles:read"))])
async def getRoleByID(
    id: str,
    request:Request,
    db: AsyncSession = Depends(get_db)   
):
    return await get_role_by_id(db, role_id=id, request=request)

@router.get("/name/{name}", dependencies=[Depends(require_permission("roles:read"))])
async def getRoleByName(
    name: str,
    request:Request,
    db: AsyncSession = Depends(get_db)   
):
    return await get_role_by_name(db, name, request=request)

@router.delete("/delete/{id}", 
    dependencies=[Depends(require_permission("roles:delete"))]
)
async def deleteRole(
    id: str,
    request:Request,
    db: AsyncSession = Depends(get_db)   
):
    return await delete_role(db, role_id=id, request=request)


@router.put("/rolepermissions/id/{id}",
    dependencies=[Depends(require_permission("roles:write"))]
)
async def editRolePermissions(
    id: str,
    data: RolePermissionUpdateRequest,
    request:Request,
    db: AsyncSession = Depends(get_db)   
):
    return await edit_role_permissions(db, role_id=id, permissions=data.permissions, name=data.name, request=request)
