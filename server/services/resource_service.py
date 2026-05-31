
from fastapi import HTTPException, Request, BackgroundTasks
from datetime import datetime, date
from uuid import UUID
import json
import hashlib
import re
from sqlalchemy.sql import func
from datetime import datetime, timezone
from db.postgressDB import AsyncSessionLocal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models.resources_model import Resources
from models.resourceSummary_model import ResourceSummary
from models.resource_lastfetched_model import ResourceLastFetched
from models.resource_version_model import ResourceVersion

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

_DATETIME_RE = re.compile(
    r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'          # ISO 8601
    r'|^\w{3},\s+\d{2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}'  # RFC 2822 (HTTP date)
)

# Top-level keys that are always volatile regardless of value
VOLATILE_KEYS = {"ResponseMetadata", "RetryAttempts", "HTTPStatusCode", "HTTPHeaders", "RequestId", "HostId", "last_used_date"}

def strip_volatile(obj):
    """
    Recursively strip volatile data before hashing.
    - Removes known volatile keys (ResponseMetadata etc.)
    - Nullifies any string value that looks like a datetime (by value, not key name)
    - Converts datetime/date objects to None
    """
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if k in VOLATILE_KEYS:
                continue                        # drop volatile keys entirely
            result[k] = strip_volatile(v)
            
        return result

    elif isinstance(obj, list):
        return [strip_volatile(i) for i in obj]

    elif isinstance(obj, (datetime, date)):
        return None                             # drop datetime objects

    elif isinstance(obj, str):
        # If the string looks like a datetime, nullify it
        if _DATETIME_RE.match(obj):
            return None
        # If it's an embedded JSON string (e.g. bucket_policy), parse and recurse
        stripped = obj.strip()
        if stripped.startswith("{") or stripped.startswith("["):
            try:
                parsed = json.loads(stripped)
                cleaned = strip_volatile(parsed)
                return json.dumps(cleaned, sort_keys=True)
            except (json.JSONDecodeError, ValueError):
                pass

        return obj

    return obj


def hash_resource(res: dict) -> str:
    stable = strip_volatile(res)
    return hashlib.sha256(
        json.dumps(stable, sort_keys=True, default=str).encode()
    ).hexdigest()

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
    
async def get_all_resource(db: AsyncSession,cloud_account_id=UUID, request=Request):
    organization_id = get_request_organization_id(request)
    query = select(Resources).where(
                    Resources.cloud_account_id == cloud_account_id,
                    Resources.organization_id == organization_id,
                    Resources.is_deleted == False
                )
    
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

async def get_resource_version_with_ID_service(db: AsyncSession, resourceId: str, request: Request):
    result = await db.execute(
        select(ResourceVersion)
        .where(ResourceVersion.resource_id == resourceId)
        .order_by(ResourceVersion.version_number.desc())
    )
    versions = result.scalars().all()

    if not versions:
        raise HTTPException(status_code=404, detail="No Resource Found")

    return versions

async def all_resources_service_aws(
    db: AsyncSession,
    account_identifier: str,
    request: Request,
    background_tasks: BackgroundTasks,
    
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
    
    
    # Add the heavy work to background
    background_tasks.add_task(
        _process_aws_resources_background,
        organization_id=organization_id,
        cloud_account_id=cloudAccount.id,
        session=session,
        request=request
    )
    
    return {
        "success": True,
        "message": "AWS resource fetching is in progress. Resources will be updated in the background.",
        "cloud_account_id": cloudAccount.id,
    }
    
def get_changed_fields(old: dict, new: dict) -> dict:
    """Returns only the fields that changed, with old and new values."""
    print(old, new)
    changes = {}
    all_keys = set(old.keys()) | set(new.keys())
    for key in all_keys:
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            changes[key] = {
                "old": old_val,
                "new": new_val
            }
    return changes
    
async def _process_aws_resources_background(
    organization_id: str,
    cloud_account_id: str,
    session,
    request: Request
):
    async with AsyncSessionLocal() as db:
        try:
            resources = await collect_all(session=session)
            total_count = resources["summary"]["total_resources"]

            summary = ResourceSummary(
                cloud_account_id=cloud_account_id,
                provider="aws",
                resource_schedular_id=None,
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
                cloud_account_id=cloud_account_id,
                request=request
            )

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
                        cloud_account_id=cloud_account_id,
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
                    await db.flush()
                    new_resources.append({
                        "resource_id": sanitized.get("resource_id"),
                        "service": sanitized.get("service")
                    })
                    db.add(ResourceVersion(
                        resource_id=resource_obj.id,
                        version_number=1,
                        configuration=sanitized.get("configuration", {}),
                        tags=sanitized.get("tags", {}),
                        resource_name=sanitized.get("resource_name"),
                        hashValue=hash_value,
                        changed_fields={}   # no previous version
                    ))

                # ───────── UPDATE RESOURCE ─────────
                else:
                    existing.is_deleted = False

                    if existing.hashValue != hash_value:
                        old_configuration = existing.configuration or {}
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
                            cloudAccountId=cloud_account_id,
                            issue_with_resource="updated",
                            request=request,
                            resourceId=existing.id
                        )
                        changed_fields = get_changed_fields(
                            old=old_configuration,
                            new=sanitized.get("configuration", {})
                        )
                        next_version = (
                            await db.scalar(
                                select(func.max(ResourceVersion.version_number))
                                .where(ResourceVersion.resource_id == existing.id)
                            ) or 0
                        ) + 1
                        
                        db.add(ResourceVersion(
                            resource_id=existing.id,
                            version_number=next_version,
                            configuration=sanitize_for_json(res.get("configuration", {})),
                            tags=sanitize_for_json(res.get("tags", {})),
                            resource_name=sanitized.get("resource_name"),
                            hashValue=hash_value,
                            changed_fields=changed_fields  # exactly what changed
                        ))

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
                    cloudAccountId=cloud_account_id,
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
                cloud_account_id=cloud_account_id
            )
            
            latestTime = await db.execute(
                select(ResourceLastFetched)
                .where(ResourceLastFetched.organization_id == organization_id, ResourceLastFetched.cloud_account_id == cloud_account_id)
            )
            
            latestTime = latestTime.scalar_one_or_none()
            if not latestTime:
                latest_fetch = ResourceLastFetched(
                    latest_fetch=datetime.now(timezone.utc),
                    cloud_account_id=cloud_account_id,
                    organization_id=organization_id 
                )
                db.add(latest_fetch)
            else:
                latestTime.latest_fetch = datetime.now(timezone.utc)
            
            await db.commit()

        except Exception as e:
            await db.rollback()
            # Log the error — you can replace this with your logger
            print(f"[Background Task Error] AWS resource sync failed: {e}")
            raise