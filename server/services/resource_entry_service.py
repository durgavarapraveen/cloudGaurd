from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.scans_model import Scans
from models.findings import Findings
from models.resources_model import Resources


async def add_information_to_database(
    db: AsyncSession,
    account_uuid,
    data: dict
):
    summary = data.get("summary", {})
    metadata = make_json_safe(dict(data.get("scan_metadata", {})))
    findings = data.get("findings", [])
    resources_by_service = make_json_safe(data.get("resources", {}))
    by_severity = summary.get("by_severity", {})
    

    metadata["resource_inventory"] = resources_by_service.get("resources", {})

    scan = Scans(
        cloud_account_id=account_uuid,

        scan_status="completed",

        started_at=datetime.now(timezone.utc),

        completed_at=datetime.now(timezone.utc),

        regions_scanned=metadata.get(
            "regions",
            []
        ),

        services_scanned=list(
            set(
                [
                    finding.get("service")
                    for finding in findings
                    if finding.get("service")
                ]
            )
        ),

        scan_metadata=metadata,

        total_resources=summary.get(
            "total_resources",
            0
        ),

        total_checks=summary.get(
            "total_checks",
            summary.get("total", 0)
        ),

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

        critical_count=summary.get(
            "critical",
            by_severity.get("CRITICAL", 0)
        ),

        high_count=summary.get(
            "high",
            by_severity.get("HIGH", 0)
        ),

        medium_count=summary.get(
            "medium",
            by_severity.get("MEDIUM", 0)
        ),

        low_count=summary.get(
            "low",
            by_severity.get("LOW", 0)
        ),

        info_count=summary.get(
            "info",
            by_severity.get("INFO", 0)
        )
    )

    db.add(scan)

    await db.flush()

    resource_lookup = await upsert_resources(
        db=db,
        account_uuid=account_uuid,
        resources_by_service=resources_by_service.get("resources", {})
    )

    findings_objects = []

    for finding in findings:
        resource_key = (
            str(finding.get("resource_id")),
            finding.get("region")
        )
        resource = resource_lookup.get(resource_key)

        findings_objects.append(

            Findings(

                scan_id=scan.id,

                resource_id=resource.id if resource else None,

                cloud_account_id=account_uuid,

                provider="aws",

                service=finding.get(
                    "service"
                ),

                region=finding.get(
                    "region"
                ),

                status=finding.get(
                    "status"
                ),

                severity=finding.get(
                    "severity"
                ),

                rule_id=finding.get(
                    "rule_id"
                ),

                rule_title=finding.get(
                    "rule_title"
                ),

                resource_identifier=finding.get(
                    "resource_id"
                ),

                resource_type=finding.get(
                    "resource_type"
                ),

                expected_value={
                    "value":
                        make_json_safe(
                            finding.get(
                                "expected_value"
                            )
                        )
                },

                actual_value={
                    "value":
                        make_json_safe(
                            finding.get(
                                "actual_value"
                            )
                        )
                },

                operator=finding.get(
                    "operator"
                ),

                remediation=finding.get(
                    "remediation"
                ),

                checked_at=datetime.now(
                    timezone.utc
                )
            )
        )

    db.add_all(findings_objects)

    await db.commit()

    await db.refresh(scan)

    return scan


async def upsert_resources(
    db: AsyncSession,
    account_uuid,
    resources_by_service: dict
):
    resource_lookup = {}

    for service, resources in resources_by_service.items():
        if not isinstance(resources, list):
            continue

        for resource_data in resources:
            if not isinstance(resource_data, dict):
                continue

            resource_identifier = resource_data.get("resource_id")
            if not resource_identifier:
                continue

            region = resource_data.get("region")

            result = await db.execute(
                select(Resources).where(
                    Resources.cloud_account_id == account_uuid,
                    Resources.resource_id == str(resource_identifier),
                    Resources.region == region
                )
            )
            resource = result.scalar_one_or_none()

            values = {
                "provider": "aws",
                "service": resource_data.get("service") or service,
                "resource_type": resource_data.get("resource_type") or service,
                "resource_id": str(resource_identifier),
                "resource_name": resource_data.get("resource_name"),
                "arn": resource_data.get("arn"),
                "region": region,
                "tags": make_json_safe(resource_data.get("tags") or {}),
                "configuration": make_json_safe(
                    resource_data.get("configuration") or resource_data
                ),
                "last_seen": datetime.now(timezone.utc),
            }

            if resource:
                for key, value in values.items():
                    setattr(resource, key, value)
            else:
                resource = Resources(
                    cloud_account_id=account_uuid,
                    first_seen=datetime.now(timezone.utc),
                    **values
                )
                db.add(resource)
                await db.flush()

            resource_lookup[(str(resource_identifier), region)] = resource

    return resource_lookup


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
