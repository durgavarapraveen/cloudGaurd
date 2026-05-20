import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db
from services.db_resources_service import get_resources_DB
from services.dashboard_service import scan_details_service, recent_scans_service

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)



@router.get("/recent-scans")
async def recent_scans(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=25, ge=1, le=100),
):
    return await recent_scans_service(request=request, db=db, limit=limit)


@router.get("/scans/{scan_id}")
async def scan_details(
    scan_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await scan_details_service(scan_id=scan_id, request=request, db=db)


@router.get("/db")
async def fetch_resources(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await get_resources_DB(request=request, db=db)
