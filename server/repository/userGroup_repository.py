from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from schemas.userGroup_schema import CreateNewGroup

from models.groups_Model import UserGroups

from sqlalchemy.orm import selectinload

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )


async def getGroupwithName_repository(db: AsyncSession, name: str, request: Request):
    organization_id = get_request_organization_id(request)
    group = await db.execute(
        select(UserGroups)
        .where(UserGroups.name == name, UserGroups.organization_id == organization_id)
    )
    group = group.scalar_one_or_none()
    return group

async def getGroupwithId_repository(db: AsyncSession, id: str, request: Request):
    organization_id = get_request_organization_id(request)
    group = await db.execute(
        select(UserGroups)
        .where(UserGroups.id == id, UserGroups.organization_id == organization_id)
        .options(selectinload(UserGroups.permissions), selectinload(UserGroups.users) )
    )
    group = group.scalar_one_or_none()
    return group