
from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.cloudAccount_Model import CloudAccounts

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )

async def getcloudAccountwithAccountIdentifier(db:AsyncSession, account_identifier: str, request: Request):
    organization_id = get_request_organization_id(request)
    print(organization_id, account_identifier)
    cloudAccount = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.organization_id == organization_id, CloudAccounts.account_identifier == account_identifier)
    )
    cloudAccount = cloudAccount.scalar_one_or_none()
    print(cloudAccount)
    if not cloudAccount:
        raise HTTPException(status_code=404, detail="No Cloud Account Found.")
    
    return cloudAccount