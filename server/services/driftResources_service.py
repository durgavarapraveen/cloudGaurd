from aiohttp import ClientError
from fastapi import HTTPException, Request
from datetime import datetime, date
from uuid import UUID
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from sqlalchemy.sql import func

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from repository.resources_repository import (
    getcloudAccountwithAccountIdentifier,
)

from models.drift_models import DriftResources, DriftStatus
from models.groups_Model import UserGroups
from models.comments_model import Comments

from services.user_service import get_user_by_id


def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )

async def getAllDriftResponse_service(
    db: AsyncSession,
    accountIdentifier: str,
    request: Request,
    page: int = 1,
    page_size: int = 10,
    status: str | None = None
):
    organizationId = get_request_organization_id(request)

    cloudAccount = await getcloudAccountwithAccountIdentifier(
        db,
        account_identifier=accountIdentifier,
        request=request
    )

    if not cloudAccount:
        raise HTTPException(
            status_code=404,
            detail="Cloud account not found"
        )

    page = max(page, 1)
    page_size = max(min(page_size, 100), 1)

    offset = (page - 1) * page_size

    # Base filters
    filters = [
        DriftResources.cloud_account_id == cloudAccount.id,
        DriftResources.organization_id == organizationId
    ]

    # Optional status filter
    if status:
        filters.append(DriftResources.status == status)
        
    total_query = await db.execute(
        select(func.count())
        .select_from(DriftResources)
        .where(*filters)
    )

    total = total_query.scalar()

    # Total count
    result = await db.execute(
        select(DriftResources)
        .where(*filters)
        .options(
            selectinload(DriftResources.resource),
            selectinload(DriftResources.assigned_to)
        )
        .offset(offset)
        .limit(page_size)
    )

    drifts = result.scalars().all()

    # Data query
    result = await db.execute(
        select(DriftResources)
        .where(*filters)
        .offset(offset)
        .limit(page_size)
    )

    drifts = result.scalars().all()
    
    print(drifts)

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
        "items": drifts
    }
    
async def getAllDriftResponsewithID_service(
    db: AsyncSession,
    accountIdentifier: str,
    request: Request,
    page: int = 1,
    page_size: int = 10,
    status: str | None = None
):
    organizationId = get_request_organization_id(request)
    userId = getattr(request.state, "user_id", None)
    cloudAccount = await getcloudAccountwithAccountIdentifier(
        db,
        account_identifier=accountIdentifier,
        request=request
    )

    if not cloudAccount:
        raise HTTPException(
            status_code=404,
            detail="Cloud account not found"
        )
        
    user = await get_user_by_id(db=db, user_id=userId, request=request)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    page = max(page, 1)
    page_size = max(min(page_size, 100), 1)

    offset = (page - 1) * page_size
    
    user_group_ids = [group.id for group in user.groups]

    # Base filters
    filters = [
        DriftResources.cloud_account_id == cloudAccount.id,
        DriftResources.organization_id == organizationId,
        DriftResources.assigned_to_id.in_(user_group_ids)
    ]

    # Optional status filter
    if status:
        filters.append(DriftResources.status == status)
        
    total_query = await db.execute(
        select(func.count())
        .select_from(DriftResources)
        .where(*filters)
    )

    total = total_query.scalar() or 0

    # Total count
    result = await db.execute(
        select(DriftResources)
        .where(*filters)
        .options(
            selectinload(DriftResources.resource),
            selectinload(DriftResources.assigned_to),
            selectinload(DriftResources.comments)
            .selectinload(Comments.user)
            
        )
        .order_by(DriftResources.first_seen.desc())
        .offset(offset)
        .limit(page_size)
    )

    drifts = result.scalars().all()

    # Data query
    result = await db.execute(
        select(DriftResources)
        .where(*filters)
        .offset(offset)
        .limit(page_size)
    )

    drifts = result.scalars().all()

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
        "items": drifts
    }
    
    
async def create_new_drift(db: AsyncSession, cloudAccountId: UUID, request: Request, resourceId: str, issue_with_resource: str):
    organizationId = get_request_organization_id(request)
    
    drift = DriftResources(
        cloud_account_id=cloudAccountId,
        organization_id=organizationId,
        resource_id=resourceId,
        issue_with_resource=issue_with_resource
    )
    
    db.add(drift)
    return {
        "message": "Drift added"
    }
    
async def update_drift_admin(db: AsyncSession, driftId: str, request: Request, assigned_grp: str ):
    organizationId = get_request_organization_id(request)
    drift = await db.execute(
        select(DriftResources)
        .where(DriftResources.id == driftId, DriftResources.organization_id == organizationId)
    )
    drift = drift.scalar_one_or_none()
    
    if not drift:
        raise HTTPException(status_code = 404, detail="Drift not Found")
    
    drift.assigned_to_id = assigned_grp
    drift.status = "assigned"
    await db.commit()
    return {
        "message": "Drift Assigned Successfully"
    }
    
async def update_drift_assigner(db: AsyncSession, driftId: str, request: Request, status: str, comment: str ):
    organizationId = get_request_organization_id(request)
    user_id = getattr(request.state, "user_id", None)
    
    result = await db.execute(
        select(DriftResources)
        .where(
            DriftResources.id == driftId,
            DriftResources.organization_id == organizationId
        )
        .options(
            selectinload(DriftResources.assigned_to)
            .selectinload(UserGroups.users)
        )
    )
    drift = result.scalar_one_or_none()
    
    if not drift:
        raise HTTPException(status_code = 404, detail="Drift not Found")
    
    allowed_user_ids = [user.id for user in drift.assigned_to.users]

    if str(user_id) not in [str(uid) for uid in allowed_user_ids]:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to update this drift"
        )
    
    drift.status = status

    if status == DriftStatus.RESOLVED:
        drift.resolved_date = datetime.utcnow()

    # Add comment history
    drift_comment = Comments(
        entity_id=drift.id,
        created_by=user_id,
        comment=comment,
        organization_id=organizationId,
        entity_type="drift"
    )

    db.add(drift_comment)

    await db.commit()
    await db.refresh(drift)

    return drift
    
    
async def getDriftWithID(db: AsyncSession, driftId: str, request: Request):
    organizationId = get_request_organization_id(request)
    
    result = await db.execute(
        select(DriftResources)
        .where(
            DriftResources.id == driftId,
            DriftResources.organization_id == organizationId
        )
        .options(
            (DriftResources.assigned_to)
            .selectinload(UserGroups.users)
        )
    )
    drift = result.scalar_one_or_none()
    
    if not drift:
        raise HTTPException(status_code = 404, detail="Drift not Found")
    
    return drift


    
    

    