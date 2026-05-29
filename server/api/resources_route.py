from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid 

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from schemas.CloudAccounts_Schema import CreateNewCloudAccount

from analyzer.iam_analyzer import run_iam_analyzer

router = APIRouter(
    prefix="/resources",
    tags=["Cloud Account Resources"]
)

from services.resource_service import (
    all_resources_service_aws,
    get_all_resources_from_DB_service,
    get_resource_summary,
    get_resource_summary_with_ID_Service,
    get_resource_detail_for_summary_Service
)


@router.get("/summary/{account_identifier}",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def get_resourceSummary(
    account_identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await get_resource_summary(db=db, account_identifier=account_identifier, request=request)

@router.get("/resources/{account_identifier}",
    dependencies=[Depends(require_permission("resource:read"))]
)
async def get_resource_db(
    account_identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    page_size: int = 50,
    service: str | None = None,    # e.g. "ec2" or "s3,iam"
):
    return await get_all_resources_from_DB_service(
        db,
        account_identifier=account_identifier,
        request=request,
        page=page,
        page_size=page_size,
        service_filter=service.split(",") if service else None
    )

@router.get(
    "/resources_cloud/{account_identifier}",
    dependencies=[Depends(require_permission("resource:read"))]
)
async def get_resource_aws(
    account_identifier: str,
    request: Request,
    services: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    service_list = services.split(",") if services else []
    return await all_resources_service_aws(
        db=db,
        account_identifier=account_identifier,
        services=service_list,
        request=request,
        schedular_id=None
    )


@router.get("/summary_ID/{resourceSummaryID}",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def get_resourceSummary_by_ID(
    resourceSummaryID: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await get_resource_summary_with_ID_Service(db=db, resourceSummaryID=resourceSummaryID,  request=request)

@router.get("/summary_ID/{resourceSummaryID}/{resourceId:path}",
    dependencies=[Depends(require_permission("resource:summary:read"))]
)
async def get_resource_detail_for_summary(
    resourceSummaryID: str,
    resourceId: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await get_resource_detail_for_summary_Service(
        db=db,
        resourceSummaryID=resourceSummaryID,
        resourceId=resourceId,
        request=request
    )
