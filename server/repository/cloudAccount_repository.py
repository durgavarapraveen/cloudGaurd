from sqlalchemy import select
from fastapi import HTTPException, Request
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import func
from sqlalchemy.orm import selectinload

from models.orginization_model import Organization
from models.cloudAccount_Model import CloudAccounts
from repository.resources_repository import serialize_resource_summary

def serialize_cloud_account(cloud_account: CloudAccounts) -> dict:
    return {
        "id": str(cloud_account.id),
        "created_by": str(cloud_account.created_by)
        if cloud_account.created_by
        else None,
        "provider": cloud_account.provider,
        "account_name": cloud_account.account_name,
        "account_identifier": cloud_account.account_identifier,
        "region": cloud_account.region,
        "is_active": cloud_account.is_active,
        "scan_status": cloud_account.scan_status,
        "last_scan_at": cloud_account.last_scan_at.isoformat()
        if cloud_account.last_scan_at
        else None,
        "last_error": cloud_account.last_error,
        "created_at": cloud_account.created_at.isoformat()
        if cloud_account.created_at
        else None,
        "updated_at": cloud_account.updated_at.isoformat()
        if cloud_account.updated_at
        else None,
        "organization_id": str(cloud_account.organization_id),
    }

def serialize_cloud_account_detail(cloud_account: CloudAccounts) -> dict:
    data = serialize_cloud_account(cloud_account)
    data["resource_summary"] = [
        serialize_resource_summary(summary)
        for summary in getattr(cloud_account, "resource_summary", [])
    ]
    return data

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
    return serialize_cloud_account(data)

async def getCloudAccountwithID_Repository(db: AsyncSession, id: str, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.id == id , CloudAccounts.organization_id == organization_id)
        .options(selectinload(CloudAccounts.scans), selectinload(CloudAccounts.resource_summary))
    )
    cloudAccount = cloudAccount.scalar_one_or_none()
    return serialize_cloud_account_detail(cloudAccount) if cloudAccount else None

async def getAllCloudAccount_Repository(db: AsyncSession, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccounts = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.organization_id == organization_id)
    )
    cloudAccounts = cloudAccounts.scalars().all()
    return [serialize_cloud_account(cloudAccount) for cloudAccount in cloudAccounts]

async def deleteCloudAccountWithID_Repository(db: AsyncSession, id: str, request: Request):
    organization_id = get_request_organization_id(request)
    result = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.id == id , CloudAccounts.organization_id == organization_id)
    )
    cloudAccount = result.scalar_one_or_none()
    if not cloudAccount:
        raise HTTPException(status_code=404, detail="No Cloud Account Found")
    
    await db.delete(cloudAccount)
    await db.commit()
    return {
        "message": "Cloud Account deleted from CSPM"
    }
