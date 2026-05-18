from fastapi import APIRouter, Body, Query, Request
from typing import List, Optional
from fastapi import Depends
from middlewares.userPermissions import require_permission as req
from sqlalchemy.ext.asyncio import AsyncSession
from db.postgressDB import get_db

from engine.validator.aws_validator import (
    validate_aws,
    get_summary,
    get_failed_findings,
    get_findings_by_severity,
    get_findings_by_service
)

router = APIRouter(
    prefix="/aws",
    tags=["AWS Security Scanner"]
)


# ──────────────────────────────────────────────
# FULL SCAN
# ──────────────────────────────────────────────

@router.post(
            "/scan",
            dependencies=[
                Depends(req("aws:scan"))
            ]
        )
async def scan_aws(
    request: Request,
    db: AsyncSession = Depends(get_db),
    account_uuid: str | None = Body(default=None, embed=True),
    regions: Optional[List[str]] = Query(default=None),

    services: Optional[List[str]] = Query(default=None),

    severities: Optional[List[str]] = Query(default=None)

):

    return await validate_aws(
        db,
        account_uuid=account_uuid,
        user_id=getattr(request.state, "user_id", None),
        regions=regions,

        services=services,

        severities=severities

    )


# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────

@router.get(
    "/summary",
    dependencies=[
        Depends(req("aws:summary:read"))
    ]
)
async def aws_summary(
    regions: Optional[List[str]] = Query(default=None)
):
    return await get_summary(
        regions=regions
    )


# ──────────────────────────────────────────────
# FAILED FINDINGS
# ──────────────────────────────────────────────

@router.get(
    "/failed",
    dependencies=[
        Depends(req("aws:findings:read"))
    ]
)
async def aws_failed(
    regions: Optional[List[str]] = Query(default=None)
):

    return await get_failed_findings(

        regions=regions

    )


# ──────────────────────────────────────────────
# SEVERITY FILTER
# ──────────────────────────────────────────────

@router.get(
    "/severity/{severity}",
    dependencies=[
        Depends(req("aws:severity:read"))
    ]
)
async def severity_filter(

    severity: str,

    regions: Optional[List[str]] = Query(default=None)

):

    return await get_findings_by_severity(

        severity=severity,

        regions=regions

    )


# ──────────────────────────────────────────────
# SERVICE FILTER
# ──────────────────────────────────────────────

@router.get(
    "/service/{service}",
    dependencies=[
        Depends(req("aws:service:read"))
    ]
)
async def service_filter(

    service: str,

    regions: Optional[List[str]] = Query(default=None)

):

    return await get_findings_by_service(

        service=service,

        regions=regions

    )
    
# ──────────────────────────────────────────────
# LOAD POLICIES
# ──────────────────────────────────────────────
