from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db

from services.driftResources_service import (
    getAllDriftResponse_service,
    update_drift_admin as update_drift_admin_service,
    update_drift_assigner,
    getAllDriftResponsewithID_service
)

router = APIRouter(
    prefix="/drift",
    tags=["Cloud Account Resources"]
)


@router.get("/{accountIdentifier}")
async def getAllDriftResponse(
    accountIdentifier: str,
    request: Request,
    page: int = 1,
    page_size: int = 10,
    status: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    return await getAllDriftResponse_service(
        db=db,
        accountIdentifier=accountIdentifier,
        request=request,
        page=page,
        page_size=page_size,
        status=status
    )
    
@router.get("/user/{accountIdentifier}")
async def getAllDriftResponseforUser(
    accountIdentifier: str,
    request: Request,
    page: int = 1,
    page_size: int = 10,
    status: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    return await getAllDriftResponsewithID_service(
        db=db,
        accountIdentifier=accountIdentifier,
        request=request,
        page=page,
        page_size=page_size,
        status=status
    )

@router.put("/update_admin/{driftId}")
async def update_drift_admin_route(
    driftId: str,
    assigned_grp: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await update_drift_admin_service(
        db=db,
        assigned_grp=assigned_grp,
        driftId=driftId,
        request=request
    )


@router.put("/update_user/{driftId}")
async def update_drift_user_route(
    driftId: str,
    status: str,
    comment: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await update_drift_assigner(
        db=db,
        comment=comment,
        status=status,
        driftId=driftId,
        request=request
    )