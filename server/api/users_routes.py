from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.user_service import (
    delete_user,
    edit_user_roles as edit_user_roles_service,  # ✅ alias to avoid name conflict
    get_all_users,
    get_all_users_with_roles,
    get_user_by_id,
    get_user_by_email
)

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

class EditRolesRequest(BaseModel):
    roles: List[str]

@router.get("/")
async def getUsers(db: AsyncSession = Depends(get_db)):
    return await get_all_users(db)

@router.get("/id/{user_id}",
            dependencies=[Depends(require_permission("users:read"))]
            )
async def getUserByID(user_id: str, db: AsyncSession = Depends(get_db)):
    return await get_user_by_id(user_id=user_id, db=db)

@router.get("/email/{email}", 
            dependencies=[Depends(require_permission("users:read"))]
            )
async def getUserByEmail(email: str, db: AsyncSession = Depends(get_db)):
    return await get_user_by_email(email=email, db=db)

@router.get("/by-roles", dependencies=[Depends(require_permission("users:read"))])
async def getAllUsersByRoles(roles: List[str], db: AsyncSession = Depends(get_db)):
    return await get_all_users_with_roles(roles=roles, db=db)

@router.delete("/delete/{user_id}", dependencies=[Depends(require_permission("users:delete"))])
async def deleteUser(user_id: str, db: AsyncSession = Depends(get_db)):
    return await delete_user(user_id=user_id, db=db)

@router.put("/edit-roles/{user_id}",
            dependencies=[Depends(require_permission("users:write"))]
            )
async def updateUserRoles(                                    
    user_id: str,
    data: EditRolesRequest,
    db: AsyncSession = Depends(get_db)                       
):
    return await edit_user_roles_service(user_id=user_id, roles=data.roles, db=db)