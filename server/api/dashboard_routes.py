import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db
from services.dashboard_service import scan_details_service, recent_scans_service, scan_resources_service

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)



@router.get("/recent-scans/{accountIdentifier}")
async def recent_scans(
    accountIdentifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=25, ge=1, le=100),
):
    return await recent_scans_service(accountIdentifier=accountIdentifier, request=request, db=db, limit=limit)


@router.get("/scans/{scan_id}")
async def scan_details(
    scan_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await scan_details_service(scan_id=scan_id, request=request, db=db)



@router.get("/scanServices/{accountIdentifier}")
async def scan_resources(
    request: Request,
    accountIdentifier: str,
    db: AsyncSession = Depends(get_db),
):
    return await scan_resources_service(db=db, accountIdentifier=accountIdentifier, request=request)