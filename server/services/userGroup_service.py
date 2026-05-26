from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from schemas.userGroup_schema import CreateNewGroup

from sqlalchemy.orm import selectinload

from repository.userGroup_repository import (
    getGroupwithName_repository,
    getGroupwithId_repository
)
from repository.roles_repository import permission_objects_from_names

from models.groups_Model import UserGroups
from models.userModel import User

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )

async def CreateUserGroup_service(db: AsyncSession, data: CreateNewGroup, request: Request):
    organization_id = get_request_organization_id(request)
    existingGroup = await getGroupwithName_repository(db=db, name=data.name, request=request)
    if existingGroup:
        raise HTTPException(status_code=404, detail="Group with this Name found")
    permission_objects = await permission_objects_from_names(db, data.permissions, request=request)
    group = UserGroups(
        name=data.name,
        organization_id=organization_id,
        description=data.description
    )
    group.permissions = permission_objects
    db.add(group)
    await db.commit()
    result = await db.execute(
        select(UserGroups)
        .where(UserGroups.id == group.id)
        .options(selectinload(UserGroups.permissions))
    )
    new_Group = result.scalar_one()
    return {
        "message": "Group created successfully",
        "id": str(new_Group.id),
        "name": new_Group.name,
        "permissions": [p.name for p in new_Group.permissions],
        "description": group.description,
    }
    
async def getAllGroups_service(db: AsyncSession, request: Request):
    organization_id = get_request_organization_id(request)
    groups = await db.execute(
        select(UserGroups)
        .where(UserGroups.organization_id == organization_id)
        .options(selectinload(UserGroups.permissions), selectinload(UserGroups.users))
    )
    groups = groups.scalars().all()
    return [                                             
        {
            "id": str(group.id),
            "name": group.name,
            "permissions": [p.name for p in group.permissions],
            "users": group.users,
            "description": group.description,
        }
        for group in groups
    ]
    
async def editGroup_service(db: AsyncSession, data: CreateNewGroup, id: str, request: Request):
    group = await getGroupwithId_repository(db=db, id=id, request=request)
    if not group:
        raise HTTPException(status_code=404, detail="NO group Found")
    group.name = data.name
    group.description=data.description
    permission_objects = await permission_objects_from_names(db, data.permissions, request=request)
    group.permissions=permission_objects
    await db.commit()
    result = await db.execute(
        select(UserGroups)
        .where(UserGroups.id == group.id)
        .options(selectinload(UserGroups.permissions), selectinload(UserGroups.users) )
    )
    new_Group = result.scalar_one()
    return {
        "message": "Group created successfully",
        "id": str(new_Group.id),
        "name": new_Group.name,
        "permissions": [p.name for p in new_Group.permissions],
        "description": group.description,
        "users": new_Group.users
    }
    
async def deleteGroup_service(db: AsyncSession, id: str, request: Request):
    group = await getGroupwithId_repository(db=db, id=id, request=request)
    if not group:
        raise HTTPException(status_code=404, detail="NO group Found")
    
    await db.delete(group)
    await db.commit()
    
    return {
        "message": "Group delete Successfully"
    }

async def addUsersToGroup_service(db: AsyncSession, users: list[str], id: str, request: Request):
    print(f"Users from client {users}")
    group = await getGroupwithId_repository(db=db, id=id, request=request)
    if not group:
        raise HTTPException(status_code=404, detail="NO group Found")
    userList = await db.execute(
        select(User)
        .where(User.id.in_(users))
    )
    print(userList)
    userList = userList.scalars().all()
    group.users = userList
    await db.commit()
    
    result = await db.execute(
        select(UserGroups)
        .where(UserGroups.id == group.id)
        .options(selectinload(UserGroups.permissions), selectinload(UserGroups.users) )
    )
    new_Group = result.scalar_one()
    return {
        "message": "Group created successfully",
        "id": str(new_Group.id),
        "name": new_Group.name,
        "permissions": [p.name for p in new_Group.permissions],
        "description": group.description,
        "users": new_Group.users
    }
    
    
async def getGroupWithID_service(db: AsyncSession, id: str, request: Request):
    group = await getGroupwithId_repository(db=db, id=id, request=request)
    if not group:
        raise HTTPException(status_code=404, detail="Group Found")
    
    return {
        "message": "Group created successfully",
        "id": str(group.id),
        "name": group.name,
        "description": group.description,
        "permissions": [p.name for p in group.permissions],
        "users": group.users
    }