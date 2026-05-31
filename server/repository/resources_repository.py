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

def serialize_resource_summary(summary: ResourceSummary) -> dict:
    return {
        "id": str(summary.id),
        "cloud_account_id": str(summary.cloud_account_id),
        "resource_schedular_id": (
            str(summary.resource_schedular_id)
            if summary.resource_schedular_id
            else None
        ),
        "provider": summary.provider,
        "organization_id": str(summary.organization_id),
        "total_resources_fetched_count": summary.total_resources_fetched_count,
        "updated_resources_count": summary.updated_resources_count,
        "deleted_resources_count": summary.deleted_resources_count,
        "updated_resource_ids": summary.updated_resource_ids or [],
        "newly_added_resource_ids": summary.newly_added_resource_ids or [],
        "deleted_resources_ids": summary.deleted_resources_ids or [],
        "newly_added_resources_count": summary.newly_added_resources_count,
        "fetched_date": summary.fetched_date.isoformat()
        if summary.fetched_date
        else None,
    }

def serialize_resource(resource: Resources) -> dict:
    return {
        "id": str(resource.id),
        "cloud_account_id": str(resource.cloud_account_id),
        "organization_id": str(resource.organization_id),
        "provider": resource.provider,
        "service": resource.service,
        "resource_type": resource.resource_type,
        "resource_id": resource.resource_id,
        "resource_name": resource.resource_name,
        "arn": resource.arn,
        "region": resource.region,
        "tags": resource.tags or {},
        "configuration": resource.configuration or {},
        "first_seen": resource.first_seen.isoformat()
        if resource.first_seen
        else None,
        "last_seen": resource.last_seen.isoformat() if resource.last_seen else None,
        "is_deleted": resource.is_deleted,
        "resource_summary_id": str(resource.resource_summary_id),
    }

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

    base_where = [
        Resources.cloud_account_id == cloud_account_id,
        Resources.organization_id == organization_id,
        Resources.is_deleted == False
    ]

    query = select(Resources).where(*base_where)

    if service_filter:
        query = query.where(Resources.service.in_(service_filter))

    # ─────────────────────────────────────────
    # TOTAL COUNT (with filter)
    # ─────────────────────────────────────────
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar()

    # ─────────────────────────────────────────
    # RESOURCES PER SERVICE (always unfiltered)
    # ─────────────────────────────────────────
    service_counts_result = await db.execute(
        select(Resources.service, func.count().label("count"))
        .where(*base_where)
        .group_by(Resources.service)
        .order_by(Resources.service)
    )
    service_breakdown = {
        row.service: row.count
        for row in service_counts_result.all()
    }

    # ─────────────────────────────────────────
    # PAGINATED RESULTS
    # ─────────────────────────────────────────
    result = await db.execute(
        query.order_by(Resources.service, Resources.resource_id)
             .offset(offset)
             .limit(page_size)
    )
    resources = result.scalars().all()

    return {
        "data": [
            {
                "id": str(resource.id),
                "service": resource.service,
                "resource_type": resource.resource_type,
                "resource_id": resource.resource_id,
                "resource_name": resource.resource_name,
                "arn": resource.arn,
            }
            for resource in resources
        ],
        "summary": {
            "total_resources": total,
            "total_services": len(service_breakdown),
            "resources_per_service": service_breakdown
            # e.g. {"s3": 12, "rds": 4, "ec2": 30}
        },
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
    return [serialize_resource_summary(item) for item in summary]

async def get_resource_summary_DB_with_ID_Repository(db: AsyncSession, resourceSummaryID: str  ,request: Request):
    organization_id = get_request_organization_id(request)
    summary = await db.execute(
        select(ResourceSummary)
        .where(ResourceSummary.id == resourceSummaryID, ResourceSummary.organization_id == organization_id)
    )
    summary = summary.scalar_one_or_none()
    return serialize_resource_summary(summary) if summary else None

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
    
    print(summary["cloud_account_id"])

    resource = await db.execute(
        select(Resources).where(
            Resources.organization_id == organization_id,
            # Resources.cloud_account_id == summary.cloud_account_id,
            Resources.resource_id == resourceId,
        )
    )
    resource = resource.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    return serialize_resource(resource)
