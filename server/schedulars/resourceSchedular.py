
from aiohttp import ClientError
from fastapi import HTTPException
from datetime import datetime
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.resources_model import Resources
from models.resourceSummary_model import ResourceSummary
from models.cloudAccount_Model import CloudAccounts

from services.resource_service import sanitize_for_json, hash_resource

from utils.aws_session import get_session as aws_session

from scanners.AWS.aws_scanner import collect_all


async def all_resources_service_aws(
    db: AsyncSession,
    cloud_account_id: str,
    services: list[str] | None,
    organization_id: str,
    schedular_id: str | None = None,
):
    print(f"Scheduler Resource Update Triggered")
    result = await db.execute(
        select(CloudAccounts)
        .where(CloudAccounts.id == cloud_account_id)
    )
    cloudAccount = result.scalar_one_or_none()
    
    if not cloudAccount:
        raise HTTPException(
            status_code=404,
            detail="Cloud account not found"
        )
    
    provider = cloudAccount.provider
    
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
        resource_schedular_id=schedular_id,
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
    
    existing_result = await db.execute(
        select(Resources)
        .where(
            Resources.cloud_account_id == cloud_account_id,
            Resources.organization_id == organization_id
        )
    )
    existing_resources = existing_result.scalars().all()
    
    existing_map = {}
    
    if existing_resources:
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
    for service_name, svc_resources in resources["resources"].items():
        for res in svc_resources:
            res.setdefault("service", service_name)
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
