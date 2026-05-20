from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from sqlalchemy.orm import selectinload

from models.orginization_model import Organization
from models.userModel import User

from schemas.organization_schema import CreateNewOrganization

from repository.organization_repository import CheckOrganization, createOrganization, CheckOrganizationwithID

async def createNewOrganizationService(db: AsyncSession, data: CreateNewOrganization, request: Request): 
    id = getattr(request.state, "user_id", None)
    userID = uuid.UUID(str(id))
    
    existingOrganization = await CheckOrganization(db, data.name)
    print(existingOrganization)
    if existingOrganization:
        raise HTTPException(status_code=400, detail="Organization with this Name Exists")
    organization = Organization(
        name=data.name,
        slug=data.slug,
        description=data.description,
        owner_id=userID,
    )
    return await createOrganization(db, organization)

async def updateOrganization(db: AsyncSession, data: CreateNewOrganization, id: str):
    existingOrganization = await CheckOrganizationwithID(db, id)
    if not existingOrganization:
        raise HTTPException(status_code=400, detail="Organization does not Exists")
    existingOrganization.name = data.name
    existingOrganization.slug = data.slug
    existingOrganization.description=data.description 
    db.commit()
    db.refresh(existingOrganization)
    return existingOrganization

async def deleteOrganization(db: AsyncSession, id: str):
    existingOrganization = await CheckOrganizationwithID(db, id)
    if not existingOrganization:
        raise HTTPException(status_code=400, detail="Organization does not Exists")
    existingOrganization.is_deleted=True
    db.commit()
    db.refresh(existingOrganization)
    return existingOrganization

async def inactiveOrganization(db: AsyncSession, id: str):
    existingOrganization = await CheckOrganizationwithID(db, id)
    if not existingOrganization:
        raise HTTPException(status_code=400, detail="Organization does not Exists")
    existingOrganization.is_active=True
    db.commit()
    db.refresh(existingOrganization)
    return existingOrganization

async def getOrganization(db: AsyncSession, id: str):
    existingOrganization = await CheckOrganizationwithID(db, id)
    if not existingOrganization:
        raise HTTPException(status_code=400, detail="Organization does not Exists")
    if existingOrganization.is_active:
        raise HTTPException(status_code=400, detail="Organization is in Inactive Mode")
    if existingOrganization.is_deleted:
        raise HTTPException(status_code=400, detail="Organization is Deleted")
    return existingOrganization

async def getAllOrginizationsService(db: AsyncSession):
    organizations = await db.execute(
        select(Organization)
        .options(selectinload(Organization.users))
    )
    return organizations.scalars().all()


    

