from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid 

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.resource_relationship_service import build_relationships_service, get_relation_resource_service, get_relation_resource_account

from analyzer.iam_analyzer import run_iam_analyzer

router = APIRouter(
    prefix="/relationship",
    tags=["Cloud Account Resources"]
)

@router.get("/build",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def get_relationships(
    cloud_account_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await build_relationships_service(db=db, cloud_account_id=cloud_account_id)

@router.get("/resource/{id}")
async def get_relationship_ofresource(
    cloudIdentifier: str,
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await get_relation_resource_service(db=db, cloudIdentifier=cloudIdentifier, resource_id=id , request=request)

@router.get("")
async def get_relationship_of_account(
    cloudIdentifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await get_relation_resource_account(db=db, cloudIdentifier=cloudIdentifier , request=request)
