from fastapi import APIRouter, Depends
from engine.loader.aws_loader import (
    load_policies,
    summarise_policies,
    get_rules_by_severity,
    get_rules_for_service
)
from middlewares.userPermissions import require_permission

router = APIRouter(
    prefix="/aws/policies",
    tags=["AWS Policies"]
)


# ──────────────────────────────────────────────
# GET ALL RULES
# ──────────────────────────────────────────────

@router.get(
    "/",
    dependencies=[
        Depends(require_permission("aws:policies:read"))
    ]
)
def get_all_policies():

    rules = load_policies()

    return {

        "success":True,

        "total":len(rules),

        "rules":rules

    }


# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────

@router.get(
    "/summary",
    dependencies=[
        Depends(require_permission("aws:policies:summary:read"))
    ]
)
def policies_summary():

    rules = load_policies()

    return {

        "success":True,

        "summary":
            summarise_policies(rules)

    }


# ──────────────────────────────────────────────
# SERVICE FILTER
# ──────────────────────────────────────────────

@router.get(
    "/service/{service}",
    dependencies=[
        Depends(require_permission("aws:policies:service:read"))
    ]
)
def policies_by_service(service:str):

    rules = load_policies()

    filtered = get_rules_for_service(
        rules,
        service
    )

    return {

        "success":True,

        "count":len(filtered),

        "rules":filtered

    }


# ──────────────────────────────────────────────
# SEVERITY FILTER
# ──────────────────────────────────────────────

@router.get(
    "/severity/{severity}",
    dependencies=[
        Depends(require_permission("aws:policies:severity:read"))
    ]
)
def policies_by_severity(severity:str):

    rules = load_policies()

    filtered = get_rules_by_severity(
        rules,
        severity
    )

    return {

        "success":True,

        "count":len(filtered),

        "rules":filtered

    }