from fastapi import APIRouter, Depends

from scanners.AWS.aws_scanner import (
    collect_all,
)

from scanners.AWS.export_resources import export_resources
from middlewares.userPermissions import require_permission


router = APIRouter(
    prefix="/aws/scanner",
    tags=["AWS Security Scanner"]
)


# ──────────────────────────────────────────────
# FULL SCAN
# ──────────────────────────────────────────────

@router.get(
    "/scan/{service}",
    dependencies=[
        Depends(require_permission("aws:scanner:scan"))
    ]
)
async def scan_aws(service: str):
    service_List = service.split(",") if service else []
    return await collect_all(
        regions=None,
        services=service_List if service_List else None
    )
    
@router.get(
    "/export/{service}",
    dependencies=[
        Depends(require_permission("aws:scanner:export"))
    ]
)
async def export_aws(service: str):
    service_List = service.split(",") if service else []
    return await export_resources(
        regions=None,
        services=service_List if service_List else None
    )

@router.get(
    "/scan/db/{service}",
    dependencies=[
        Depends(require_permission("aws:scanner:scan"))
    ]
)
async def scan_aws_db(service: str):
    service_List = service.split(",") if service else []
    return await collect_all(
        regions=None,
        services=service_List if service_List else None
    )