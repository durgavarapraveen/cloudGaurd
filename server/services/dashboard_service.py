import uuid
from uuid import UUID
from typing import Any
from datetime import datetime, timezone,date
from decimal import Decimal
from enum import Enum
from sqlalchemy.orm import selectinload

from fastapi import HTTPException,  Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.findings_model import Findings
from models.resources_model import Resources
from models.scans_model import Scans

from services.resource_service import get_all_resource

from engine.checker.aws_checker import run_checks

from repository.resources_repository import (
    getcloudAccountwithAccountIdentifier
)

from yaml_loader.yaml_loader import get_policies

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )
    
def flatten_mongo_rules(docs):
    rules = []
    for doc in docs:
        provider = doc.get("provider")
        service = doc.get("service")
        yaml_data = doc.get("data", {})
        for rule in yaml_data.get("rules", []):
            rule["provider"] = provider
            rule["service"] = service
            rule["_source_file"] = f"mongo:{doc['_id']}"
            rules.append(rule)
    return rules
    
def make_json_safe(value):
    if isinstance(value, dict):
        return {
            str(key): make_json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple, set)):
        return [
            make_json_safe(item)
            for item in value
        ]

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, (UUID, Enum)):
        return str(value)

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")

    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def serialize_scan(scan: Scans) -> dict[str, Any]:
    print(scan)
    return {
        "id": str(scan.id),
        "cloud_account_id": str(scan.cloud_account_id),
        "scan_status": scan.scan_status,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "completed_at": (
            scan.completed_at.isoformat() if scan.completed_at else None
        ),
        "scan_duration_seconds": scan.scan_duration_seconds,
        "regions_scanned": scan.regions_scanned or [],
        "services_scanned": scan.services_scanned or [],
        # "scan_metadata": public_scan_metadata(scan.scan_metadata or {}),
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
        "organization_id": str(scan.organization_id),   
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


async def recent_scans_service(
    accountIdentifier: str,
    request: Request,
    db: AsyncSession,
    limit: int = 25,
):
    
    cloudAccount = await getcloudAccountwithAccountIdentifier(db, account_identifier=accountIdentifier, request=request)   
    cloud_account_id = cloudAccount.id
    
    scans= await db.execute(
        select(Scans)
        .where(Scans.cloud_account_id == cloud_account_id)
        .order_by(
            desc(Scans.completed_at).nullslast(),
            desc(Scans.started_at),
            desc(Scans.created_at),
        )
        .limit(limit)
    )

    scans = scans.scalars().all()
    print("[scans] count:", len(scans))
    
    scans = [
        serialize_scan(scan)
        for scan in scans
    ]

    return {
        "success": True,
        "count": len(scans),
        "scans": scans,
    }
    
async def scan_details_service(
    scan_id: uuid.UUID,
    request: Request,
    db: AsyncSession,
):

    scan = await db.execute(
        select(Scans)
        .where(Scans.id == scan_id)
        .options(selectinload(Scans.findings))
    )

    scan = scan.scalar_one_or_none()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    findings = [
        serialize_finding(finding)
        for finding in scan.findings
    ]
    
    resources = await db.execute(
        select(Resources)
        .where(Resources.cloud_account_id == scan.cloud_account_id)
    )
    
    resources = resources.scalars().all()

    services_scanned = scan.services_scanned or []
    # if services_scanned:
    #     resources_query = resources_query.where(
    #         Resources.service.in_(services_scanned)
    #     )

    resources = [
        serialize_resource(resource)
        for resource in resources
    ]

    inventory_by_service: dict[str, list[dict[str, Any]]] = {}
    for resource in resources:
        inventory_by_service.setdefault(resource["service"], []).append(resource)

    return {
        "success": True,
        "scan": serialize_scan(scan),
        "findings": findings,
        "inventory": resources,
        "inventory_by_service": inventory_by_service,
        "counts": {
            "findings": len(findings),
            "inventory": len(resources),
        },
    }

def resource_to_dict(r: Resources) -> dict:
    return {
        "resource_id": r.id,
        "service":       r.service,
        "resource_type": r.resource_type,
        "resource_identifier":   r.resource_id,
        "resource_name": r.resource_name,
        "region":        r.region,
        "provider":      r.provider,
        "arn":           r.arn,
        "tags":          r.tags or {},
        "configuration": r.configuration or {},
        # spread configuration fields so jmespath can resolve paths like
        # "encryption.Rules[0]..." directly on the resource dict
        **(r.configuration or {}),
    }

async def scan_resources_service(db: AsyncSession, accountIdentifier: str, request: Request, severities=None, github=str | None):
    started_at = datetime.now(timezone.utc)
    
    cloudAccount = await getcloudAccountwithAccountIdentifier(db, account_identifier=accountIdentifier, request=request)   
    cloud_account_id = cloudAccount.id
    
    resources = await get_all_resource(db=db, account_identifier=accountIdentifier,cloud_account_id=cloud_account_id, request=request)
    
    mongo_docs = await get_policies()
    rules = flatten_mongo_rules(mongo_docs)
    
    flat_resources = [resource_to_dict(r) for r in resources]

    results = await run_checks(flat_resources, rules)
    
    completed_at = datetime.now(timezone.utc) 
    duration_seconds = (completed_at - started_at).total_seconds()
    
    findings = results.get(
        "findings",
        []
    )
    
    if severities:
        findings = [
            f for f in findings
            if f.get("severity") in severities
        ]
        
    # Add data to database
    summary = results.get(
        "summary",
        {}
    )
    summary["total_resources"] = len(resources)
    
    #regions scanned 
    regions = []
    
    data = {
        "success": True,
        "scan_time":
            datetime.now(
                timezone.utc
            ).isoformat(),
        "summary":
            summary,
        "findings":
            findings,
        "resources":
            resources,
        "started_at": started_at,          
        "completed_at": completed_at,    
        "duration_seconds": duration_seconds,
        "regions": regions
    }
    
    if github is None:
        #add information to scans
        scan=await feed_info_scans(db=db, cloud_account_id=cloud_account_id,data=data,request=request)
    
    
        for finding_dict in findings:
            
            resource = None

            finding_obj = Findings(
                scan_id=scan.id,
                cloud_account_id=cloud_account_id,
                organization_id=get_request_organization_id(request),
                resource_id=finding_dict.get("resource_id"),
                resource_identifier=str(resource.resource_id) if resource else str(finding_dict.get("resource_id") or ""),
                service=finding_dict.get("service") or "",
                region=finding_dict.get("region"),
                status=finding_dict.get("status") or "",
                severity=finding_dict.get("severity"),
                rule_id=finding_dict.get("rule_id") or "",
                rule_title=finding_dict.get("rule_title") or "",
                resource_type=finding_dict.get("resource_type"),
                actual_value=finding_dict.get("actual_value"),
                expected_value=finding_dict.get("expected_value"),
                operator=finding_dict.get("operator"),
                remediation=finding_dict.get("remediation"),
                checked_at=datetime.now(timezone.utc),
                finding_metadata={
                    "source_file": finding_dict.get("source_file"),
                },
            )
            db.add(finding_obj)

        await db.commit()

    
    return {
        "success": True,

        "scan_id": scan.id,

        "summary": data["summary"],

        "findings": findings
    }

async def feed_info_scans(db: AsyncSession, cloud_account_id: str, data: dict, request: Request):
    organization_id = get_request_organization_id(request)
    
    summary = data.get("summary", {})
    findings = data.get("findings", [])
    resources_by_service = make_json_safe(data.get("resources", {}))
    by_severity = summary.get("by_severity", {})
    started_at = data.get("started_at") 
    completed_at = data.get("completed_at") 
    duration_seconds = data.get("duration_seconds")
    regions = data.get("regions")
    scan = Scans(
        cloud_account_id=cloud_account_id,
        scan_status="completed",
        started_at=started_at,
        completed_at=completed_at,
        scan_duration_seconds=int(duration_seconds),
        regions_scanned=regions,
        services_scanned=list(
            set(
                [
                    finding.get("service")
                    for finding in findings
                    if finding.get("service")
                ]
            )
        ),
        # scan_metadata=data.scan_metadata,
        total_resources=summary.get(
            "total_resources",
            0
        ),
        total_checks=summary.get("total", 0),
        total_passed=summary.get(
            "passed",
            0
        ),
        total_failed=summary.get(
            "failed",
            0
        ),
        total_warning=summary.get(
            "warning",
            summary.get("errored", 0)
        ),
        critical_count=by_severity.get("CRITICAL", 0),
        high_count=by_severity.get("HIGH", 0),
        medium_count=by_severity.get("MEDIUM", 0),
        low_count=by_severity.get("LOW", 0),
        info_count=by_severity.get("INFO", 0),
        organization_id=organization_id
    )
    
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan

    