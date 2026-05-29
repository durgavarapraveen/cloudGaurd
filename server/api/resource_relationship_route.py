from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid 

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.resource_relationship_service import build_relationships_service

from analyzer.iam_analyzer import run_iam_analyzer

router = APIRouter(
    prefix="/relationship",
    tags=["Cloud Account Resources"]
)

@router.get("",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def get_relationships(
    cloud_account_id: str,
    organization_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await build_relationships_service(db=db, cloud_account_id=cloud_account_id, organizationId=organization_id)

@router.get("/iam",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def get_relationships(
    cloud_account_id: str,
    organization_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await run_iam_analyzer(db=db, cloud_account_id=cloud_account_id, organization_id=organization_id)