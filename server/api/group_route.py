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
    tags=["User Group"]
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
    id: str,
    db: AsyncSession = Depends(get_db)
):
    return await getGroupWithID_service(db=db, id=id, request=request)

@router.post("/create")
async def cerateNewGroup(
    request: Request,
    data: CreateNewGroup,
    db: AsyncSession = Depends(get_db)
):
    print(data)
    return await CreateUserGroup_service(db=db, data=data, request=request)

@router.put("/edit/{id}")
async def cerateNewGroup(
    request: Request,
    data: CreateNewGroup,
    id: str,
    db: AsyncSession = Depends(get_db)
):
    return await editGroup_service(db=db, data=data, id=id, request=request)

@router.put("/addUsers/{id}")
async def createNewGroup(
    request: Request,
    users: list[str],
    id: str,
    db: AsyncSession = Depends(get_db)
):
    return await addUsersToGroup_service(db=db, users=users, id=id, request=request)

@router.delete("/delete/{id}")
async def getAllGroups(
    request: Request,
    id: str,
    db: AsyncSession = Depends(get_db)
):
    return await deleteGroup_service(db=db, id=id, request=request)
