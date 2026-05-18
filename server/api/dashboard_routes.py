import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db
from models.accounts_model import Accounts
from models.findings import Findings
from models.resources_model import Resources
from models.scans_model import Scans

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


def serialize_scan(scan: Scans, account: Accounts | None = None) -> dict[str, Any]:
    return {
        "id": str(scan.id),
        "cloud_account_id": str(scan.cloud_account_id),
        "account_id": account.account_id if account else None,
        "account_name": account.account_name if account else None,
        "provider": account.provider if account else None,
        "scan_status": scan.scan_status,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "completed_at": (
            scan.completed_at.isoformat() if scan.completed_at else None
        ),
        "scan_duration_seconds": scan.scan_duration_seconds,
        "regions_scanned": scan.regions_scanned or [],
        "services_scanned": scan.services_scanned or [],
        "scan_metadata": public_scan_metadata(scan.scan_metadata or {}),
        "total_resources": scan.total_resources or 0,
        "total_checks": scan.total_checks or 0,
        "total_passed": scan.total_passed or 0,
        "total_failed": scan.total_failed or 0,
        "total_warning": scan.total_warning or 0,
        "critical_count": scan.critical_count or 0,
        "high_count": scan.high_count or 0,
        "medium_count": scan.medium_count or 0,
        "low_count": scan.low_count or 0,
        "info_count": scan.info_count or 0,
        "created_at": scan.created_at.isoformat() if scan.created_at else None,
    }


def public_scan_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in metadata.items()
        if key != "resource_inventory"
    }


def serialize_finding(finding: Findings) -> dict[str, Any]:
    return {
        "id": str(finding.id),
        "scan_id": str(finding.scan_id),
        "cloud_account_id": str(finding.cloud_account_id),
        "resource_db_id": str(finding.resource_id) if finding.resource_id else None,
        "provider": finding.provider,
        "service": finding.service,
        "region": finding.region,
        "status": finding.status,
        "severity": finding.severity,
        "rule_id": finding.rule_id,
        "rule_title": finding.rule_title,
        "resource_id": finding.resource_identifier,
        "resource_name": finding.resource_identifier,
        "resource_type": finding.resource_type,
        "expected_value": unwrap_json_value(finding.expected_value),
        "actual_value": unwrap_json_value(finding.actual_value),
        "operator": finding.operator,
        "remediation": finding.remediation,
        "source_file": None,
        "checked_at": finding.checked_at.isoformat() if finding.checked_at else None,
        "finding_metadata": finding.finding_metadata or {},
    }


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


def serialize_inventory_snapshot(resources_by_service: dict) -> list[dict[str, Any]]:
    resources = []

    for service, service_resources in resources_by_service.items():
        if not isinstance(service_resources, list):
            continue

        for index, resource in enumerate(service_resources):
            if not isinstance(resource, dict):
                continue

            resource_id = resource.get("resource_id")
            resources.append(
                {
                    "id": f"{service}:{resource_id or index}",
                    "cloud_account_id": None,
                    "provider": "aws",
                    "service": resource.get("service") or service,
                    "resource_type": resource.get("resource_type") or service,
                    "resource_id": resource_id or "",
                    "resource_name": resource.get("resource_name"),
                    "arn": resource.get("arn"),
                    "region": resource.get("region"),
                    "tags": resource.get("tags") or {},
                    "configuration": resource.get("configuration") or resource,
                    "first_seen": None,
                    "last_seen": None,
                }
            )

    return resources


def unwrap_json_value(value: dict | None) -> Any:
    if isinstance(value, dict) and set(value.keys()) == {"value"}:
        return value.get("value")
    return value


def parse_user_id(request: Request) -> uuid.UUID | str | None:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        return None

    try:
        return uuid.UUID(str(user_id))
    except ValueError:
        return user_id


@router.get("/recent-scans")
async def recent_scans(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=25, ge=1, le=100),
):
    user_id = parse_user_id(request)

    query = (
        select(Scans, Accounts)
        .join(Accounts, Scans.cloud_account_id == Accounts.id, isouter=True)
        .order_by(
            desc(Scans.completed_at).nullslast(),
            desc(Scans.started_at),
            desc(Scans.created_at),
        )
        .limit(limit)
    )

    if user_id:
        query = query.where(Accounts.user_id == user_id)

    result = await db.execute(query)
    scans = [
        serialize_scan(scan, account)
        for scan, account in result.all()
    ]

    return {
        "success": True,
        "count": len(scans),
        "scans": scans,
    }


@router.get("/scans/{scan_id}")
async def scan_details(
    scan_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = parse_user_id(request)

    query = (
        select(Scans, Accounts)
        .join(Accounts, Scans.cloud_account_id == Accounts.id)
        .where(Scans.id == scan_id)
    )

    if user_id:
        query = query.where(Accounts.user_id == user_id)

    result = await db.execute(query)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")

    scan, account = row

    findings_result = await db.execute(
        select(Findings)
        .where(Findings.scan_id == scan.id)
        .order_by(Findings.severity, Findings.service, Findings.rule_id)
    )
    findings = [
        serialize_finding(finding)
        for finding in findings_result.scalars().all()
    ]

    inventory_snapshot = (scan.scan_metadata or {}).get("resource_inventory")
    if isinstance(inventory_snapshot, dict):
        resources = serialize_inventory_snapshot(inventory_snapshot)
    else:
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
        "scan": serialize_scan(scan, account),
        "findings": findings,
        "inventory": resources,
        "inventory_by_service": inventory_by_service,
        "counts": {
            "findings": len(findings),
            "inventory": len(resources),
        },
    }
