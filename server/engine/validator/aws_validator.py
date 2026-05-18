import os
import json
import logging
import uuid
from datetime import datetime, timezone

from scanners.AWS.aws_scanner import collect_all
from engine.checker.aws_checker import run_checks, Status
from yaml_loader.yaml_loader import get_policies
from models.accounts_model import Accounts
from services.resource_entry_service import add_information_to_database
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# CORE VALIDATION ENGINE
# ──────────────────────────────────────────────

async def validate_aws(
        db: AsyncSession | None = None,
        account_uuid=None,
        user_id=None,
        regions=None,
        services=None,
        severities=None
):
    try:
        if not regions:
            regions = [
                os.getenv(
                    "AWS_DEFAULT_REGION",
                    "ap-south-1"
                )
            ]
        # Load rules
        # rules = load_policies()
        mongo_docs = await get_policies()
        rules = flatten_mongo_rules(mongo_docs)

        # Filter rules by service
        if services:
            rules = [
                r for r in rules
                if r.get("service") in services
            ]
            
        # Collect AWS resources
        resources = await collect_all(
            regions=regions,
            services=services
        )
        account_uuid = resources.get(
                "scan_metadata",
                {}
            ).get(
                "account_id"
            )

        # Run rule engine
        results = await run_checks(
            resources,
            rules
        )

        findings = results.get(
            "findings",
            []
        )

        # Apply severity filter
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
        summary["total_resources"] = resources.get(
            "summary",
            {}
        ).get(
            "total_resources",
            0
        )

        data = {
            "success": True,
            "scan_time":
                datetime.now(
                    timezone.utc
                ).isoformat(),
            "scan_metadata":
                resources.get(
                    "scan_metadata",
                    {}
                ),
            "summary":
                summary,

            "findings":
                findings,

            "resources":
                resources,
        }

        scan_id = None
        if db is not None:
            account_db_id = await resolve_scan_account_id(
                db=db,
                account_uuid=account_uuid,
                user_id=user_id,
                metadata=resources.get("scan_metadata", {})
            )

            scan = await add_information_to_database(
                db=db,
                account_uuid=account_db_id,
                data=data
            )
            scan_id = str(scan.id)

        return {
            "success": True,

            "scan_id": scan_id,

            "scan_time": data["scan_time"],

            "scan_metadata": data["scan_metadata"],

            "summary": data["summary"],

            "findings": findings
        }

    except Exception as e:

        logger.exception(
            "AWS validation failed"
        )

        return {

            "success": False,

            "error": str(e)
        }


async def resolve_scan_account_id(
        db: AsyncSession,
        account_uuid=None,
        user_id=None,
        metadata=None
):
    metadata = metadata or {}

    if account_uuid:
        try:
            parsed_account_uuid = uuid.UUID(str(account_uuid))
            existing = await db.get(Accounts, parsed_account_uuid)
            if existing:
                return existing.id
        except (TypeError, ValueError):
            pass

    account_id = metadata.get("account_id")
    if not account_id or account_id == "unknown":
        raise ValueError("AWS account id could not be detected from STS")

    if not user_id:
        raise ValueError("Authenticated user id is required to save scan")

    parsed_user_id = uuid.UUID(str(user_id))

    result = await db.execute(
        select(Accounts).where(
            Accounts.user_id == parsed_user_id,
            Accounts.provider == "aws",
            Accounts.account_id == str(account_id)
        )
    )
    account = result.scalar_one_or_none()

    if account:
        return account.id

    account = Accounts(
        user_id=parsed_user_id,
        provider="aws",
        account_id=str(account_id),
        account_name=f"AWS {account_id}"
    )
    db.add(account)
    await db.flush()

    return account.id


# ──────────────────────────────────────────────
# SUMMARY ONLY
# ──────────────────────────────────────────────

async def get_summary(regions=None):

    results = await validate_aws(
        regions=regions
    )

    if not results["success"]:

        return results

    return {

        "success": True,

        "summary":
            results.get(
                "summary",
                {}
            )
    }


# ──────────────────────────────────────────────
# FAILED FINDINGS
# ──────────────────────────────────────────────

async def get_failed_findings(regions=None):

    results = await validate_aws(
        regions=regions
    )

    if not results["success"]:

        return results

    failed = [

        f for f in results.get(
            "findings",
            []
        )

        if f.get("status")
        ==
        Status.FAIL.value

    ]

    return {

        "success": True,

        "total_failed":
            len(failed),

        "failures":
            failed
    }


# ──────────────────────────────────────────────
# FILTER BY SEVERITY
# ──────────────────────────────────────────────

async def get_findings_by_severity(
        severity,
        regions=None
):

    results = await validate_aws(
        regions=regions
    )

    if not results["success"]:

        return results

    findings = [

        f for f in results.get(
            "findings",
            []
        )

        if f.get(
            "severity",
            ""
        ).lower()

        ==

        severity.lower()

    ]

    return {

        "success": True,

        "count":
            len(findings),

        "findings":
            findings
    }


# ──────────────────────────────────────────────
# FILTER BY SERVICE
# ──────────────────────────────────────────────

async def get_findings_by_service(
        service,
        regions=None
):

    results = await validate_aws(
        regions=regions
    )

    if not results["success"]:

        return results

    findings = [

        f for f in results.get(
            "findings",
            []
        )

        if f.get("service")
        ==
        service

    ]

    return {

        "success": True,

        "count":
            len(findings),

        "findings":
            findings
    }


# ──────────────────────────────────────────────
# EXPORT HELPERS
# ──────────────────────────────────────────────

def export_json(
        results,
        path
):

    try:

        with open(
                path,
                "w",
                encoding="utf-8"
        ) as f:

            json.dump(

                results,
                f,
                indent=2,
                default=str

            )

        return True

    except Exception as e:

        logger.error(e)

        return False


def export_csv(
        findings,
        path
):

    import csv

    fields = [

        "status",
        "severity",

        "rule_id",
        "rule_title",

        "service",

        "resource_type",
        "resource_id",

        "region",

        "actual_value",

        "operator",
        "expected_value",

        "remediation",

        "checked_at"
    ]

    try:

        with open(

                path,
                "w",

                newline="",
                encoding="utf-8"

        ) as f:

            writer = csv.DictWriter(

                f,

                fieldnames=fields,

                extrasaction="ignore"

            )

            writer.writeheader()

            writer.writerows(
                findings
            )

        return True

    except Exception as e:

        logger.error(e)

        return False
    
    
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
