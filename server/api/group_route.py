import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.userGroup_service import (
    addUsersToGroup_service,
    CreateUserGroup_service,
    deleteGroup_service,
    getAllGroups_service,
    editGroup_service,  
    getGroupWithID_service
)

from schemas.userGroup_schema import CreateNewGroup

router = APIRouter(
    prefix="/group",
    tags=["User Group"],
    dependencies=[Depends(require_permission("group:read"))],
)

@router.get("")
async def getAllGroups(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await getAllGroups_service(db=db, request=request)

@router.get("/{id}")
async def getAllGroups(
    request: Request,
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await getGroupWithID_service(db=db, id=str(id), request=request)

@router.post("/create",
    dependencies=[Depends(require_permission("group:create"))],
)
async def cerateNewGroup(
    request: Request,
    data: CreateNewGroup,
    db: AsyncSession = Depends(get_db)
):
    return await CreateUserGroup_service(db=db, data=data, request=request)

@router.put("/edit/{id}",
    dependencies=[Depends(require_permission("group:update"))],
)
async def cerateNewGroup(
    request: Request,
    data: CreateNewGroup,
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await editGroup_service(db=db, data=data, id=str(id), request=request)

@router.put("/addUsers/{id}",
    dependencies=[Depends(require_permission("group:update"))],
)
async def createNewGroup(
    request: Request,
    users: list[str],
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await addUsersToGroup_service(db=db, users=users, id=str(id), request=request)

@router.delete("/delete/{id}",
    dependencies=[Depends(require_permission("group:delete"))],
)
async def getAllGroups(
    request: Request,
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await deleteGroup_service(db=db, id=str(id), request=request)
