from aiohttp import ClientError
from fastapi import HTTPException, Request
from datetime import datetime, date
from uuid import UUID
import json
import hashlib
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.resources_model import Resources
from models.resourceSummary_model import ResourceSummary

from repository.resources_repository import (
    getcloudAccountwithAccountIdentifier,
    get_aLL_resources_DB_Repository,
    get_resource_summary_DB_Repository,
    get_resource_summary_DB_with_ID_Repository,
    get_resource_detail_for_summary_DB_Repository
)

from utils.aws_session import get_session as aws_session

from scanners.AWS.aws_scanner import collect_all

from .driftResources_service import create_new_drift
from .resource_relationship_service import build_relationships_service

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )
    
def hash_resource(res: dict) -> str:
    stable = json.dumps(res, sort_keys=True, default=str)  # ✅ sorted + safe
    return hashlib.sha256(stable.encode()).hexdigest()

def sanitize_for_json(obj):
    """Recursively convert non-serializable types to JSON-safe values."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()         # "2024-01-15T10:30:00"
    elif isinstance(obj, UUID):
        return str(obj)                # "019e4bf5-41a2-..."
    elif isinstance(obj, float) and obj != obj:  # NaN check
        return None
    return obj

async def all_resources_service_aws(
    db: AsyncSession,
    account_identifier: str,
    services: list[str] | None,
    request: Request,
    schedular_id: str | None = None
):
    organization_id = get_request_organization_id(request)

    cloudAccount = await getcloudAccountwithAccountIdentifier(
        db,
        account_identifier=account_identifier,
        request=request
    )

    if not cloudAccount:
        raise HTTPException(404, "Cloud account not found")

    if cloudAccount.provider != "aws":
        raise HTTPException(400, "Only AWS supported currently")

    creds = cloudAccount.credentials
    aws_key = creds.get("access_key_id")
    aws_secret = creds.get("secret_access_key")

    if not aws_key or not aws_secret:
        raise HTTPException(400, "Missing AWS credentials")

    try:
        session = aws_session(aws_key=aws_key, aws_secret=aws_secret)
    except Exception:
        raise HTTPException(400, "Invalid AWS credentials")

    # ─────────────────────────────────────────
    # FETCH AWS RESOURCES
    # ─────────────────────────────────────────
    resources = await collect_all(session=session, services=services)
    total_count = resources["summary"]["total_resources"]

    summary = ResourceSummary(
        cloud_account_id=cloudAccount.id,
        provider="aws",
        resource_schedular_id=schedular_id,
        organization_id=organization_id,
        total_resources_fetched_count=total_count,
        updated_resources_count=0,
        newly_added_resources_count=0,
        deleted_resources_count=0,
        fetched_date=datetime.now(timezone.utc),
        updated_resource_ids=[],
        newly_added_resource_ids=[],
        deleted_resources_ids=[]
    )

    db.add(summary)
    await db.flush()

    # ─────────────────────────────────────────
    # LOAD EXISTING RESOURCES
    # ─────────────────────────────────────────
    existing_resources = await get_all_resource(
        db,
        services=services,
        cloud_account_id=cloudAccount.id,
        request=request
    )

    # KEY MUST MATCH DB UNIQUE CONSTRAINT
    # (org, account, resource_id, region)
    existing_map = {
        (r.resource_id, r.region): r
        for r in (existing_resources or [])
    }

    # ─────────────────────────────────────────
    # FLATTEN AWS RESOURCES
    # ─────────────────────────────────────────
    all_resources = []

    for service_name, svc_resources in resources["resources"].items():
        for res in svc_resources:
            res["service"] = service_name
            all_resources.append(res)

    # ─────────────────────────────────────────
    # PROCESSING STATE
    # ─────────────────────────────────────────
    seen = set()
    current_keys = set()

    new_resources = []
    updated_resources = []
    deleted_resources = []

    # ─────────────────────────────────────────
    # UPSERT LOGIC IN MEMORY
    # ─────────────────────────────────────────
    for res in all_resources:

        sanitized = sanitize_for_json(res)
        hash_value = hash_resource(sanitized)

        key = (
            sanitized.get("resource_id"),
            sanitized.get("region")
        )

        if key in seen:
            continue
        seen.add(key)
        current_keys.add(key)

        existing = existing_map.get(key)

        # ───────── NEW RESOURCE ─────────
        if not existing:
            resource_obj = Resources(
                organization_id=organization_id,
                cloud_account_id=cloudAccount.id,
                provider="aws",
                service=sanitized.get("service"),
                resource_type=sanitized.get("resource_type"),
                resource_id=sanitized.get("resource_id"),
                resource_name=sanitized.get("resource_name"),
                arn=sanitized.get("arn"),
                region=sanitized.get("region"),
                tags=sanitize_for_json(res.get("tags", {})),
                configuration=sanitize_for_json(res.get("configuration", {})),
                hashValue=hash_value,
                resource_summary_id=summary.id
            )

            db.add(resource_obj)

            new_resources.append({
                "resource_id": sanitized.get("resource_id"),
                "service": sanitized.get("service")
            })

        # ───────── UPDATE RESOURCE ─────────
        else:
            existing.is_deleted = False

            if existing.hashValue != hash_value:
                existing.resource_name = sanitized.get("resource_name")
                existing.tags = sanitize_for_json(res.get("tags", {}))
                existing.configuration = sanitize_for_json(res.get("configuration", {}))
                existing.hashValue = hash_value

                updated_resources.append({
                    "resource_id": sanitized.get("resource_id"),
                    "service": sanitized.get("service")
                })

                await create_new_drift(
                    db=db,
                    cloudAccountId=cloudAccount.id,
                    issue_with_resource="updated",
                    request=request,
                    resourceId=existing.id
                )

    # ─────────────────────────────────────────
    # HANDLE DELETED RESOURCES
    # ─────────────────────────────────────────
    existing_keys = set(existing_map.keys())
    deleted_keys = existing_keys - current_keys

    for key in deleted_keys:
        resource = existing_map[key]

        resource.is_deleted = True

        deleted_resources.append({
            "resource_id": resource.resource_id,
            "service": resource.service
        })

        await create_new_drift(
            db=db,
            cloudAccountId=cloudAccount.id,
            issue_with_resource="deleted",
            request=request,
            resourceId=resource.id
        )

    # ─────────────────────────────────────────
    # UPDATE SUMMARY
    # ─────────────────────────────────────────
    summary.updated_resources_count = len(updated_resources)
    summary.newly_added_resources_count = len(new_resources)
    summary.deleted_resources_count = len(deleted_resources)

    summary.updated_resource_ids = updated_resources
    summary.newly_added_resource_ids = new_resources
    summary.deleted_resources_ids = deleted_resources
    
    await build_relationships_service(
        db=db,
        cloud_account_id=cloudAccount.id
    )

    await db.commit()
    await db.refresh(summary)

    return {
        "success": True,
        "new_resources": len(new_resources),
        "updated_resources": len(updated_resources),
        "deleted_resources": len(deleted_resources),
        "new_resource_ids": new_resources,
        "updated_resource_ids": updated_resources,
        "deleted_resource_ids": deleted_resources,
    }
                


async def get_all_resources_from_DB_service(
    db, account_identifier, request,
    page=1, page_size=50, service_filter=None
):
    cloudAccount = await getcloudAccountwithAccountIdentifier(
        db, account_identifier=account_identifier, request=request
    )
    return await get_aLL_resources_DB_Repository(
        db,
        cloud_account_id=cloudAccount.id,
        request=request,
        page=page,
        page_size=page_size,
        service_filter=service_filter
    )


async def get_resource_summary(db: AsyncSession, account_identifier: str , request: Request):
    cloudAccount = await getcloudAccountwithAccountIdentifier(db, account_identifier=account_identifier, request=request)   
    cloud_account_id = cloudAccount.id
    summary = await get_resource_summary_DB_Repository(db, cloud_account_id=cloud_account_id, request=request)
    return summary

async def get_resource_summary_with_ID_Service(db: AsyncSession,resourceSummaryID: str , request: Request):
    summary = await get_resource_summary_DB_with_ID_Repository(db=db, resourceSummaryID=resourceSummaryID, request=request)
    if not summary:
        raise HTTPException(status_code=404, detail="Resource summary not found")
    
    return summary

async def get_resource_detail_for_summary_Service(
    db: AsyncSession,
    resourceSummaryID: str,
    resourceId: str,
    request: Request,
):
    return await get_resource_detail_for_summary_DB_Repository(
        db=db,
        resourceSummaryID=resourceSummaryID,
        resourceId=resourceId,
        request=request,
    )
    
async def get_all_resource(db: AsyncSession, services: list[str],cloud_account_id=UUID, request=Request):
    organization_id = get_request_organization_id(request)
    query = select(Resources).where(
                    Resources.cloud_account_id == cloud_account_id,
                    Resources.organization_id == organization_id,
                    Resources.is_deleted == False
                )
    
    
    if services and "ALL" not in services:
        query = query.where(Resources.service.in_(services))
    result = await db.execute(query)
    resources = result.scalars().all()
    return resources
    

async def get_resource_with_ID_service(db=AsyncSession, resourceId=str, request=Request):
    resource = await db.execute(
        select(Resources)
        .where(Resources.id == resourceId)
    )
    resource = resource.scalar_one_or_none()
    return resource