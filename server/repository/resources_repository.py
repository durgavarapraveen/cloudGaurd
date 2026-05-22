from sqlalchemy import select
from fastapi import HTTPException, Request
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from math import ceil

from sqlalchemy import func
from sqlalchemy.orm import selectinload

from models.resourceSummary_model import ResourceSummary
from models.resources_model import Resources
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

async def get_aLL_resources_DB_Repository(
    db, cloud_account_id, request,
    page=1, page_size=50, service_filter=None
):
    organization_id = get_request_organization_id(request)
    offset = (page - 1) * page_size

    query = (
        select(Resources)
        .where(
            Resources.cloud_account_id == cloud_account_id,
            Resources.organization_id == organization_id
        )
    )

    if service_filter:
        query = query.where(Resources.service.in_(service_filter))

    # total count
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar()

    # paginated results
    result = await db.execute(
        query.order_by(Resources.service, Resources.resource_id)
             .offset(offset)
             .limit(page_size)
    )
    resources = result.scalars().all()

    return {
        "data": resources,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ceil(total / page_size)
        }
    }
 
async def get_resource_summary_DB_Repository(db: AsyncSession, cloud_account_id: str ,request: Request):
    organization_id = get_request_organization_id(request)
    summary = await db.execute(
        select(ResourceSummary)
        .where(ResourceSummary.cloud_account_id == cloud_account_id, ResourceSummary.organization_id == organization_id)
        .order_by(ResourceSummary.fetched_date.desc())
    )
    summary = summary.scalars().all()
    
    # sort from latest to oldest
    return summary

async def get_resource_summary_DB_with_ID_Repository(db: AsyncSession, resourceSummaryID: str  ,request: Request):
    organization_id = get_request_organization_id(request)
    summary = await db.execute(
        select(ResourceSummary)
        .where(ResourceSummary.id == resourceSummaryID, ResourceSummary.organization_id == organization_id)
    )
    summary = summary.scalar_one_or_none()
    return summary

async def get_resource_detail_for_summary_DB_Repository(
    db: AsyncSession,
    resourceSummaryID: str,
    resourceId: str,
    request: Request,
):
    organization_id = get_request_organization_id(request)

    summary = await get_resource_summary_DB_with_ID_Repository(
        db=db,
        resourceSummaryID=resourceSummaryID,
        request=request,
    )
    if not summary:
        raise HTTPException(status_code=404, detail="Resource summary not found.")

    resource = await db.execute(
        select(Resources).where(
            Resources.organization_id == organization_id,
            Resources.cloud_account_id == summary.cloud_account_id,
            Resources.resource_id == resourceId,
        )
    )
    resource = resource.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    return resource
