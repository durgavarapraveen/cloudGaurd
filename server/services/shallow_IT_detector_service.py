# services/shadow_it_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request, HTTPException
from sqlalchemy import select

from models.resources_model import Resources
from models.resource_relationship_model import ResourceRelationShip

from repository.cloudAccount_repository import getCloudAccountwithIdentifier_Repository


# -------------------------------------------------------
# IaC Detection
# -------------------------------------------------------

IAC_TAG_KEYS = [
    "aws:cloudformation:stack-name",
    "aws:cloudformation:stack-id",
    "aws:cdk:path",
    "terraform",
    "managed-by",
    "provisioned-by",
]

IAC_TAG_VALUES = [
    "terraform",
    "cdk",
    "cloudformation",
    "pulumi",
    "ansible",
]

OWNER_TAG_KEYS = [
    "owner",
    "team",
    "squad",
    "created_by",
    "managed_by",
    "contact",
    "responsible",
    "engineer",
]

# -------------------------------------------------------
# Exclusions
# -------------------------------------------------------

EXCLUDED_RESOURCE_TYPES = {
    "iam_account_summary",
    "ebs_account_settings",

    "iam_aws_managed_policy",
    "aws_service_linked_role",

    "default_vpc",
    "default_subnet",
    "default_security_group",
    "default_route_table",
}

NO_RELATIONSHIP_EXEMPT = {
    "iam_account_summary",
    "ebs_account_settings",
    "route53_hosted_zone",
}

IAM_TYPES = {
    "iam_user",
    "iam_role",
    "iam_policy",
}



AWS_ROLE_PATTERNS = [
    "AWSServiceRoleFor",
    "aws-service-role",
]


# -------------------------------------------------------
# Helpers
# -------------------------------------------------------

def get_tag_value(tags: list, key: str):
    if not tags:
        return None

    key = key.lower()

    for tag in tags:
        if not isinstance(tag, dict):
            continue

        tag_key = (
            tag.get("Key")
            or tag.get("key")
            or ""
        ).lower()

        if tag_key == key:
            return tag.get("Value") or tag.get("value")

    return None


def has_iac_tag(tags: list) -> bool:

    if not tags:
        return False

    for tag in tags:

        if not isinstance(tag, dict):
            continue

        key = (
            tag.get("Key")
            or tag.get("key")
            or ""
        ).lower()

        value = (
            tag.get("Value")
            or tag.get("value")
            or ""
        ).lower()

        for iac_key in IAC_TAG_KEYS:
            if iac_key.lower() in key:
                return True

        for iac_val in IAC_TAG_VALUES:
            if (
                iac_val in value
                and key in (
                    "managed-by",
                    "managed_by",
                    "provisioner",
                    "tool",
                )
            ):
                return True

    return False


def has_owner_tag(tags: list) -> bool:

    for owner_key in OWNER_TAG_KEYS:
        val = get_tag_value(tags, owner_key)

        if val and str(val).strip():
            return True

    return False


# def is_internal_resource(resource: Resources) -> bool:

#     name = (resource.resource_name or "").lower()

#     return any(
#         pattern in name
#         for pattern in INTERNAL_RESOURCE_PATTERNS
#     )


def is_service_linked_role(resource: Resources) -> bool:

    arn = resource.arn or ""

    if "aws-service-role" in arn:
        return True

    name = resource.resource_name or ""

    return any(
        pattern in name
        for pattern in AWS_ROLE_PATTERNS
    )


def is_default_resource(resource: Resources) -> bool:

    cfg = resource.configuration or {}

    if resource.resource_type == "ec2_security_group":
        return (
            resource.resource_name == "default"
            or cfg.get("GroupName") == "default"
        )

    if resource.resource_type == "ec2_vpc":
        return cfg.get("IsDefault") is True

    if resource.resource_type == "ec2_subnet":
        return cfg.get("DefaultForAz") is True

    return False


# -------------------------------------------------------
# Scoring
# -------------------------------------------------------

def get_shadow_risk_score(
    resource_type: str,
    signals: dict
):

    score = 0

    if resource_type in IAM_TYPES:
        if signals["no_iac"]:
            score += 20
    else:
        if signals["no_iac"]:
            score += 35

    if signals["no_owner"]:
        score += 30

    if signals["no_relationships"]:
        score += 20

    if signals["no_tags"]:
        score += 15

    if score >= 80:
        severity = "CRITICAL"
    elif score >= 60:
        severity = "HIGH"
    elif score >= 35:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return score, severity


def build_reason(signals: dict):

    reasons = []

    if signals["no_iac"]:
        reasons.append(
            "no IaC tags found — likely manually created"
        )

    if signals["no_owner"]:
        reasons.append(
            "no owner/team tag — unowned resource"
        )

    if signals["no_relationships"]:
        reasons.append(
            "no connections to other resources — orphaned"
        )

    if signals["no_tags"]:
        reasons.append(
            "completely untagged"
        )

    return "; ".join(reasons)


# -------------------------------------------------------
# Main Detector
# -------------------------------------------------------

async def detect_shadow_it(
    db: AsyncSession,
    cloudIdentifier: str,
    request: Request
):
    
    cloud = await getCloudAccountwithIdentifier_Repository(db=db, indentifier=cloudIdentifier, request=request)

    if not cloud:
        raise HTTPException(status_code = 404, detail="No Cloud Account Found")

    result = await db.execute(
        select(Resources).where(
            Resources.cloud_account_id == cloud.id,
            Resources.is_deleted == False,
        )
    )

    resources = result.scalars().all()

    rel_result = await db.execute(
        select(
            ResourceRelationShip.source_id,
            ResourceRelationShip.target_id,
        ).where(
            ResourceRelationShip.cloud_account_id == cloud.id
        )
    )

    rel_rows = rel_result.fetchall()

    connected_ids = set()

    for row in rel_rows:
        connected_ids.add(str(row.source_id))
        connected_ids.add(str(row.target_id))

    shadow_resources = []

    summary = {
        "total_scanned": 0,
        "shadow_it_found": 0,
        "by_severity": {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
        },
        "by_resource_type": {},
        "signals": {
            "no_iac": 0,
            "no_owner": 0,
            "no_relationships": 0,
            "no_tags": 0,
        },
    }

    for resource in resources:

        # --------------------------------------------------
        # Skip exclusions
        # --------------------------------------------------

        if resource.resource_type in EXCLUDED_RESOURCE_TYPES:
            continue

        # if is_internal_resource(resource):
        #     continue

        if is_service_linked_role(resource):
            continue

        if is_default_resource(resource):
            continue

        summary["total_scanned"] += 1

        tags = resource.tags or []

        signals = {
            "no_iac":
                not has_iac_tag(tags),

            "no_owner":
                not has_owner_tag(tags),

            "no_relationships":
                (
                    resource.resource_type
                    not in NO_RELATIONSHIP_EXEMPT
                )
                and (
                    str(resource.id)
                    not in connected_ids
                ),

            "no_tags":
                len(tags) == 0,
        }

        signal_count = sum(
            1 for value in signals.values()
            if value
        )

        if signal_count < 2:
            continue

        score, severity = get_shadow_risk_score(
            resource.resource_type,
            signals,
        )

        shadow_resources.append({
            "resource_id": str(resource.id),
            "resource_name": resource.resource_name,
            "resource_type": resource.resource_type,
            "cloud_resource_id": resource.resource_id,
            "arn": resource.arn,
            "region": resource.region,
            "score": score,
            "severity": severity,
            "signals": signals,
            "tags_present": len(tags),
            "reason": build_reason(signals),
        })

        summary["shadow_it_found"] += 1

        summary["by_severity"][severity] += 1

        summary["by_resource_type"][
            resource.resource_type
        ] = (
            summary["by_resource_type"].get(
                resource.resource_type,
                0,
            ) + 1
        )

        for signal, value in signals.items():
            if value:
                summary["signals"][signal] += 1

    shadow_resources.sort(
        key=lambda x: x["score"],
        reverse=True,
    )

    return {
        "summary": summary,
        "findings": shadow_resources,
    }