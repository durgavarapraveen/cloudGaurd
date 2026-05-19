import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.accounts_model import Accounts
from models.findings import Findings
from models.resources_model import Resources
from models.scans_model import Scans



def parse_user_id(request: Request) -> uuid.UUID | str | None:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        return None

    try:
        return uuid.UUID(str(user_id))
    except ValueError:
        return user_id
    
def serialize_resource(resource: Resources) -> dict[str, Any]:
    return {
        "id": str(resource.id),
        "cloud_account_id": str(resource.cloud_account_id),
        "provider": resource.provider,
        "service": resource.service,
        "resource_type": resource.resource_type,
        "resource_id": resource.resource_id,
        "resource_name": resource.resource_name,
        "arn": resource.arn,
        "region": resource.region,
        "tags": resource.tags or {},
        "configuration": resource.configuration or {},
        "first_seen": resource.first_seen.isoformat() if resource.first_seen else None,
        "last_seen": resource.last_seen.isoformat() if resource.last_seen else None,
    }

async def get_resources_DB(
    db: AsyncSession,
    request: Request
):
    user_id = parse_user_id(request)
    
    if user_id:
        query = query.where(Accounts.user_id == user_id)
        
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    scan, account = row
    
    resources_query = (
        select(Resources)
        .where(Resources.cloud_account_id == scan.cloud_account_id)
        .order_by(Resources.service, Resources.region, Resources.resource_id)
    )
    
    services_scanned = scan.services_scanned or []
    if services_scanned:
        resources_query = resources_query.where(
            Resources.service.in_(services_scanned)
        )

    resources_result = await db.execute(resources_query)
    resources = [
        serialize_resource(resource)
        for resource in resources_result.scalars().all()
    ]

    inventory_by_service: dict[str, list[dict[str, Any]]] = {}
    for resource in resources:
        inventory_by_service.setdefault(resource["service"], []).append(resource)

    return {
        "success": True,
        "inventory": resources,
        "inventory_by_service": inventory_by_service,
        "counts": {
            "inventory": len(resources),
        },
    }
    