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

async def all_resources_service_aws(db: AsyncSession, account_identifier: str, services: list[str] , request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await getcloudAccountwithAccountIdentifier(db, account_identifier=account_identifier, request=request)
    
    if not cloudAccount:
        raise HTTPException(
            status_code=404,
            detail="Cloud account not found"
        )
    
    provider = cloudAccount.provider
    
    print("Cloud Account Provider: ", provider)
    
    if provider != "aws":
        raise HTTPException(
            status_code=400,
            detail="Only AWS supported currently"
        )
        

    creds = cloudAccount.credentials
    aws_key = creds.get("access_key_id")
    aws_secret = creds.get("secret_access_key")

    if not aws_key or not aws_secret:
        raise HTTPException(status_code=400, detail="Missing AWS credentials")

    try:
        session = aws_session(aws_key=aws_key, aws_secret=aws_secret)
    except ClientError as e:
        print(f"AWS session creation failed: {str(e)}")
        error_code = e.response["Error"]["Code"]
        
        if error_code == "InvalidClientTokenId":
            raise HTTPException(status_code=400, detail="Invalid AWS Access Key ID")
        elif error_code == "AuthFailure":
            raise HTTPException

    resources = await collect_all(session=session, services=services)
    resource_count = resources["summary"]["total_resources"]
    
    summary = ResourceSummary(
        cloud_account_id=cloudAccount.id,
        provider=provider,
        organization_id=organization_id,
        total_resources_fetched_count=resource_count,
        updated_resources_count=0,
        newly_added_resources_count=0,
        fetched_date=datetime.now(timezone.utc),
        updated_resource_ids=[],
        newly_added_resource_ids=[]
    )
    
    db.add(summary)
    await db.flush()
    
    existing_resources = await get_all_resources_from_DB_service(db, account_identifier=account_identifier, request=request) 
    
    existing_map = {
        (
            r.resource_id,
            r.region,
            r.service
        ): r
        for r in existing_resources
    }
    
    updated_resource = []
    new_resources = []
    all_resources = []
    for svc_resources in resources["resources"].values():
        all_resources.extend(svc_resources)
    
    for res in all_resources:
        sanitized = sanitize_for_json(res)
        hash_value = hash_resource(sanitized)
        key = (
            sanitized.get("resource_id"),
            sanitized.get("region"),
            sanitized.get("service")
        )
        
        existing = existing_map.get(key)
        # NEW RESOURCE
        if not existing:
            resource_obj = Resources(
                organization_id=organization_id,
                cloud_account_id=cloudAccount.id,
                provider=provider,
                service=res.get("service"),
                resource_type=res.get("resource_type"),
                resource_id=res.get("resource_id"),
                resource_name=res.get("resource_name"),
                arn=res.get("arn"),
                region=res.get("region"),
                tags=sanitize_for_json(res.get("tags", {})),        
                configuration=sanitize_for_json(res.get("configuration", {})), 
                hashValue=hash_value,
                resource_summary_id=summary.id
            )
            db.add(resource_obj)            
            new_resources.append({
                "resource_id": res.get("resource_id"),
                "service": res.get("service")
            })

        # UPDATED RESOURCE
        else:
            if existing.hashValue != hash_value:
                existing.resource_name = sanitized.get("resource_name")
                existing.tags = sanitized.get("tags", {})              # ✅ sanitized
                existing.configuration = sanitized.get("configuration", {})  # ✅ sanitized
                existing.hashValue = hash_value
                updated_resource.append({
                    "resource_id": sanitized.get("resource_id"),
                    "service": sanitized.get("service")
                })
                
    print(len(updated_resource))
    summary.updated_resources_count = len(updated_resource)
    summary.newly_added_resources_count = len(new_resources)
    summary.newly_added_resource_ids = new_resources
    summary.updated_resource_ids = updated_resource
    await db.commit()
    await db.refresh(summary)

    return {
        "success": True,

        "new_resources": len(new_resources),

        "updated_resources": len(updated_resource),

        "new_resource_ids": new_resources,

        "updated_resource_ids": updated_resource
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
    
    
