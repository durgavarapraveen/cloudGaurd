from fastapi import APIRouter, Depends, Request, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from schemas.user_schema import CreateUserByAdmin
from services.user_service import (
    create_new_user,
    delete_user,
    edit_user_info,
    edit_user_roles as edit_user_roles_service, 
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
    
class EditUserInfoRequest(BaseModel):
    name: str
    email: str
    
@router.post("/create", dependencies=[Depends(require_permission("users:create"))])
async def createUser(
    data: CreateUserByAdmin,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    return await create_new_user(db=db, data=data, request=request, background_tasks=background_tasks)

@router.get("", dependencies=[Depends(require_permission("users:read"))])
@router.get("/", dependencies=[Depends(require_permission("users:read"))])
async def getUsers(request: Request,db: AsyncSession = Depends(get_db)):
    return await get_all_users(db, request=request)

@router.get("/id/{user_id}",
    dependencies=[Depends(require_permission("users:read"))]
)
async def getUserByID(user_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    return await get_user_by_id(user_id=user_id, request=request, db=db)

@router.get("/email/{email}", 
    dependencies=[Depends(require_permission("users:read"))]
)
async def getUserByEmail(email: str,request: Request, db: AsyncSession = Depends(get_db)):
    return await get_user_by_email(email=email, db=db, request=request)

@router.get("/by-roles", dependencies=[Depends(require_permission("users:read"))])
async def getAllUsersByRoles(roles: List[str],request: Request, db: AsyncSession = Depends(get_db)):
    return await get_all_users_with_roles(roles=roles, db=db, request=request)

@router.delete("/delete/{user_id}", dependencies=[Depends(require_permission("users:delete"))])
async def deleteUser(user_id: str,request: Request, db: AsyncSession = Depends(get_db)):
    return await delete_user(user_id=user_id, request=request, db=db)

@router.put("/edit-roles/{user_id}",
    dependencies=[Depends(require_permission("users:write"))]
)
async def updateUserRoles(                                    
    user_id: str,
    data: EditRolesRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)                       
):
    return await edit_user_roles_service(user_id=user_id, roles=data.roles, db=db, request=request)

@router.put("/edit-info/{user_id}",
        dependencies=[Depends(require_permission("users:write"))]
    )
async def updateUserInfo(                                    
    user_id: str,
    data: EditUserInfoRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)                       
):
    return await edit_user_info(user_id=user_id, name=data.name,request=request, email=data.email, db=db)



