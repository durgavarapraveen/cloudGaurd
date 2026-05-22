from fastapi import HTTPException, Request
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


from models.cloudAccount_Model import CloudAccounts
from schemas.CloudAccounts_Schema import (
    CreateNewCloudAccount,
)

from repository.cloudAccount_repository import (
    getCloudAccountwithIdentifier_Repository, 
    getCloudAccountwithName_Repository,
    createCloudAccount_Repository,
    getCloudAccountwithID_Repository,
    getAllCloudAccount_Repository,
    deleteCloudAccountWithID_Repository
)

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )

async def createNewCloudAccount_Service(db: AsyncSession, data: CreateNewCloudAccount, request: Request):
    id = getattr(request.state, "user_id", None)
    userID = uuid.UUID(str(id))
    print("User ID from request state:", userID)
    organization_id = get_request_organization_id(request)
    existing_cloudAccount = await getCloudAccountwithIdentifier_Repository(db, data.account_identifier, request)
    if existing_cloudAccount:
        raise HTTPException(status_code=404, detail="Cloud Account with this Account Identifier Already exists")
    existing_cloudAccount = await getCloudAccountwithName_Repository(db, data.account_name, request)
    if existing_cloudAccount:
        raise HTTPException(status_code=404, detail="Cloud Account with this Account Name Already exists")
    cloudAccount = CloudAccounts(
        account_name=data.account_name,
        account_identifier=data.account_identifier,
        organization_id=organization_id,
        created_by=userID,
        region=data.region,
        credentials=data.credentials,
        provider=data.provider
    )
    return await createCloudAccount_Repository(db, data=cloudAccount)
    
async def getCloudAccountwithID(db: AsyncSession, id: uuid.UUID, request: Request):
    existing_cloudAccount = await getCloudAccountwithID_Repository(db, id, request)
    if not existing_cloudAccount:
        raise HTTPException(status_code=404, detail="No Cloud Account Found")
    return existing_cloudAccount

async def getAllCloudAccount_Service(db: AsyncSession,request: Request):
    return await getAllCloudAccount_Repository(db, request)
    
async def deleteCloudAccount_Service(db: AsyncSession, id: uuid.UUID, request: Request):
    existing_cloudAccount = await getCloudAccountwithID_Repository(db, id, request)
    if not existing_cloudAccount:
        raise HTTPException(status_code=404, detail="No Cloud Account Found")
    return await deleteCloudAccountWithID_Repository(db, id, request)
    