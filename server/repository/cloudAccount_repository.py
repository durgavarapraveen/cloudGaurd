from sqlalchemy import select
from fastapi import HTTPException, Request
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import func
from sqlalchemy.orm import selectinload

from models.orginization_model import Organization
from models.cloudAccount_Model import CloudAccounts


def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )


async def getCloudAccountwithIdentifier_Repository(db: AsyncSession, indentifier: str, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.account_identifier == indentifier, CloudAccounts.organization_id == organization_id)
    )
    cloudAccount = cloudAccount.scalar_one_or_none()
    return cloudAccount

async def getCloudAccountwithName_Repository(db: AsyncSession, name: str, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.account_name == name, CloudAccounts.organization_id == organization_id)
    )
    cloudAccount = cloudAccount.scalar_one_or_none()
    return cloudAccount

async def createCloudAccount_Repository(db: AsyncSession, data: CloudAccounts):
    db.add(data)
    await db.commit()
    await db.refresh(data)
    return data

async def getCloudAccountwithID_Repository(db: AsyncSession, id: str, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.id == id , CloudAccounts.organization_id == organization_id)
        .options(selectinload(CloudAccounts.scans), selectinload(CloudAccounts.resource_summary))
    )
    cloudAccount = cloudAccount.scalar_one_or_none()
    return cloudAccount

async def getAllCloudAccount_Repository(db: AsyncSession, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccounts = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.organization_id == organization_id)
    )
    cloudAccounts = cloudAccounts.scalars().all()
    return cloudAccounts

async def deleteCloudAccountWithID_Repository(db: AsyncSession, id: str, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.id == id , CloudAccounts.organization_id == organization_id)
    )
    
    db.delete(cloudAccount)
    await db.commit()
    return {
        "message": "Cloud Account deleted from CSPM"
    }