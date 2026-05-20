from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import func

from models.orginization_model import Organization

from cache.cache import organization_Id

async def CheckOrganization(db: AsyncSession, name: str):
    organization = await db.execute(
        select(Organization)
        .where(Organization.name == name)
    )
    return organization.scalar_one_or_none()

async def createOrganization(db: AsyncSession, data: Organization):
    db.add(data)
    await db.commit()
    await db.refresh(data)
    return data


async def CheckOrganizationwithID(db: AsyncSession, id: str):
    organization = await db.get(Organization, id)
    return organization

async def getOrgIDfromSlug(db: AsyncSession, slug: str):
    organization = await db.execute(
        select(Organization)
        .where(func.lower(Organization.slug) == slug)
    )
    
    organization = organization.scalar_one_or_none()

    if not organization:
        return None
    
    organization_Id[slug] = organization.id
    
    return organization.id
