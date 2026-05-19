from fastapi import APIRouter, Depends
from engine.checker.aws_checker import (
    scan_aws_resources,
    get_summary,
    get_failed_findings,
    get_findings_by_severity
)
from middlewares.userPermissions import require_permission

router = APIRouter(
    prefix="/aws/checker",
    tags=["AWS Validator"]
)


# Full scan
@router.get(
    "/scan",
    dependencies=[
        Depends(require_permission("aws:checker:scan"))
    ]
)
async def scan():
    return await scan_aws_resources()


# Only summary
@router.get(
    "/summary",
    dependencies=[
        Depends(require_permission("aws:checker:summary:read"))
    ]
)
async def summary():
    return await get_summary()


# Only failed findings
@router.get(
    "/failed",
    dependencies=[
        Depends(require_permission("aws:checker:failed:read"))
    ]
)
async def failed():
    return {
        "failed_findings": await get_failed_findings()
    }


# Filter by severity
@router.get(
    "/severity/{severity}",
    dependencies=[
        Depends(require_permission("aws:checker:severity:read"))
    ]
)
async def by_severity(severity: str):
    return {
        "severity": severity,
        "findings": await get_findings_by_severity(severity)
    }