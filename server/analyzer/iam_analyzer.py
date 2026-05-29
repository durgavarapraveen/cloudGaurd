# analyzers/iam_analyzer.py

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.resources_model import Resources

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────

ACCESS_KEY_AGE_CRITICAL_DAYS = 365
ACCESS_KEY_AGE_HIGH_DAYS     = 180
ACCESS_KEY_AGE_MEDIUM_DAYS   = 90

ROLE_UNUSED_CRITICAL_DAYS    = 180
ROLE_UNUSED_HIGH_DAYS        = 90

# Actions that allow privilege escalation
DANGEROUS_ACTIONS = {
    "CRITICAL": [
        "*",
        "iam:*",
        "sts:*",
    ],
    "HIGH": [
        "iam:CreatePolicyVersion",      # Replace any policy = admin
        "iam:SetDefaultPolicyVersion",  # Rollback to permissive version
        "iam:PassRole",                 # Pass high-priv role to service
        "iam:AttachUserPolicy",         # Attach any policy to any user
        "iam:AttachRolePolicy",         # Attach any policy to any role
        "iam:AttachGroupPolicy",        # Attach any policy to any group
        "iam:PutUserPolicy",            # Inline policy on any user
        "iam:PutRolePolicy",            # Inline policy on any role
        "iam:PutGroupPolicy",           # Inline policy on any group
        "iam:AddUserToGroup",           # Add user to admin group
        "iam:CreateAccessKey",          # Create keys for other users
        "iam:UpdateAccessKey",          # Activate disabled keys
        "sts:AssumeRole",               # Assume any role (with *)
        "lambda:UpdateFunctionCode",    # Modify lambda running as high-priv role
        "ec2:RunInstances",             # Launch with high-priv instance profile
    ],
    "MEDIUM": [
        "iam:CreateLoginProfile",       # Create console access for any user
        "iam:UpdateLoginProfile",       # Change any user password
        "iam:DeactivateMFADevice",      # Remove MFA from any user
        "iam:DeleteVirtualMFADevice",
        "iam:CreateVirtualMFADevice",
        "iam:UpdateAssumeRolePolicy",   # Modify who can assume a role
        "iam:DeleteRolePolicy",
        "iam:DeleteUserPolicy",
        "iam:DeleteGroupPolicy",
        "glue:CreateDevEndpoint",       # Glue dev endpoint with role
        "glue:UpdateDevEndpoint",
        "cloudformation:CreateStack",   # CF stack can execute with role
        "cloudformation:UpdateStack",
    ]
}

# Sensitive ports for cross-referencing (not IAM but useful)
SENSITIVE_SERVICES_IN_RESOURCE = [
    "s3", "rds", "dynamodb", "secretsmanager",
    "kms", "ssm", "ec2", "lambda"
]

now = datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def days_since(dt: datetime | None) -> int | None:
    if dt is None:
        return None
    return (now - dt).days


def extract_policy_statements(
    policy_document: dict | str | None
) -> list[dict]:
    """
    Normalize policy document into a flat list of statements.
    Handles dict, JSON string, and URL-encoded formats.
    """
    if not policy_document:
        return []

    if isinstance(policy_document, str):
        try:
            policy_document = json.loads(policy_document)
        except Exception:
            return []

    stmts = policy_document.get("Statement", [])

    # Always return as list
    if isinstance(stmts, dict):
        stmts = [stmts]

    return stmts


def normalize_to_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    if value:
        return [value]
    return []


def finding(severity: str, check: str, detail: str,
            resource_id: str = "", resource_name: str = "") -> dict:
    return {
        "severity":      severity,
        "check":         check,
        "detail":        detail,
        "resource_id":   resource_id,
        "resource_name": resource_name,
    }


# ─────────────────────────────────────────────────────────────
# 1. WILDCARD + DANGEROUS PATTERN ANALYZER
# ─────────────────────────────────────────────────────────────

def analyze_policy_document(
    policy_document: dict | str | None,
    policy_name: str,
    attached_to: str
) -> list[dict]:
    """
    Scan a single policy document for dangerous patterns.
    Returns list of findings.
    """
    findings = []
    stmts = extract_policy_statements(policy_document)

    for stmt in stmts:

        effect = stmt.get("Effect", "Allow")
        if effect != "Allow":
            # Deny statements are fine
            continue

        actions   = normalize_to_list(stmt.get("Action", []))
        resources = normalize_to_list(stmt.get("Resource", []))
        condition = stmt.get("Condition", {})
        has_condition = bool(condition)

        # ── Resource wildcard ──────────────────────────────
        resource_is_wildcard = "*" in resources

        # ── Check each action ──────────────────────────────
        for action in actions:
            action_lower = action.lower()

            # Full wildcard
            if action == "*":
                findings.append(finding(
                    "CRITICAL",
                    "WILDCARD_ACTION",
                    f"Policy '{policy_name}' on {attached_to} allows "
                    f"Action:* on Resource:{resources}. "
                    f"Full admin access granted.",
                ))
                continue

            # Service wildcard e.g. iam:*
            if action.endswith(":*"):
                service = action.split(":")[0]
                sev = "CRITICAL" if service == "iam" else "HIGH"
                findings.append(finding(
                    sev,
                    "SERVICE_WILDCARD",
                    f"Policy '{policy_name}' on {attached_to} allows "
                    f"{action} — full {service.upper()} control.",
                ))
                continue

            # Dangerous action checks
            for sev, dangerous_list in DANGEROUS_ACTIONS.items():
                # Normalize both sides for matching
                matched = any(
                    action_lower == d.lower()
                    for d in dangerous_list
                    if ":" in d  # skip bare "*" already handled
                )
                if not matched:
                    continue

                # PassRole without condition is more dangerous
                if (
                    action_lower == "iam:passrole"
                    and resource_is_wildcard
                    and not has_condition
                ):
                    findings.append(finding(
                        "CRITICAL",
                        "PASSROLE_NO_CONDITION",
                        f"Policy '{policy_name}' on {attached_to} allows "
                        f"iam:PassRole on Resource:* with no condition. "
                        f"Any role can be passed to any service.",
                    ))

                elif action_lower == "sts:assumerole" and resource_is_wildcard:
                    findings.append(finding(
                        "CRITICAL",
                        "ASSUMEROLE_WILDCARD",
                        f"Policy '{policy_name}' on {attached_to} allows "
                        f"sts:AssumeRole on Resource:*. Can assume any role.",
                    ))

                else:
                    # Only flag HIGH/MEDIUM if also on wildcard resource
                    # or condition is missing
                    if resource_is_wildcard or not has_condition:
                        findings.append(finding(
                            sev,
                            "DANGEROUS_ACTION",
                            f"Policy '{policy_name}' on {attached_to} "
                            f"allows {action} on "
                            f"{'*' if resource_is_wildcard else str(resources)}."
                            + (" No condition applied." if not has_condition else ""),
                        ))

    return findings


# ─────────────────────────────────────────────────────────────
# 2. POLICY ANALYZER — runs on all policies from DB
# ─────────────────────────────────────────────────────────────

def run_policy_checks(resources: list[dict]) -> list[dict]:
    """
    Input:  your DB resources (resource_type = iam_policy)
    Output: list of findings
    """
    all_findings = []

    for r in resources:
        if r.get("resource_type") != "iam_policy":
            continue

        cfg  = r.get("configuration", {})
        name = r.get("resource_name", "unknown")
        doc  = cfg.get("policy_document")

        policy_findings = analyze_policy_document(
            doc, name,
            attached_to=f"managed_policy:{r.get('arn', name)}"
        )
        all_findings.extend(policy_findings)

    return all_findings


# ─────────────────────────────────────────────────────────────
# 3. ACCESS KEY AGE TRACKER
# ─────────────────────────────────────────────────────────────

def run_access_key_checks(resources: list[dict]) -> list[dict]:
    """
    Input:  your DB resources (resource_type = iam_user)
    Output: list of findings
    """
    all_findings = []

    for r in resources:
        if r.get("resource_type") != "iam_user":
            continue

        cfg      = r.get("configuration", {})
        username = r.get("resource_name", "unknown")
        uid      = r.get("resource_id", "")
        keys     = cfg.get("access_keys", [])

        for key in keys:

            if key.get("status") != "Active":
                continue

            key_id   = key.get("access_key_id", "")
            created  = parse_dt(key.get("created"))
            age_days = days_since(created)

            if age_days is None:
                continue

            last_used    = parse_dt(key.get("last_used_date"))
            never_used   = last_used is None
            last_used_days = days_since(last_used)
            

            # Age-based findings
            if age_days >= ACCESS_KEY_AGE_CRITICAL_DAYS:
                all_findings.append(finding(
                    "CRITICAL",
                    "ACCESS_KEY_TOO_OLD",
                    f"User '{username}' key {key_id} is "
                    f"{age_days} days old (limit: {ACCESS_KEY_AGE_CRITICAL_DAYS}). "
                    f"Last used: {'never' if never_used else f'{last_used_days} days ago'}.",
                    resource_id=uid, resource_name=username
                ))
            elif age_days >= ACCESS_KEY_AGE_HIGH_DAYS:
                all_findings.append(finding(
                    "HIGH",
                    "ACCESS_KEY_AGING",
                    f"User '{username}' key {key_id} is "
                    f"{age_days} days old. Rotation recommended.",
                    resource_id=uid, resource_name=username
                ))
            elif age_days >= ACCESS_KEY_AGE_MEDIUM_DAYS:
                all_findings.append(finding(
                    "MEDIUM",
                    "ACCESS_KEY_AGING",
                    f"User '{username}' key {key_id} is "
                    f"{age_days} days old. Plan rotation soon.",
                    resource_id=uid, resource_name=username
                ))

            # Never used active key
            if never_used and age_days > 7:
                all_findings.append(finding(
                    "MEDIUM",
                    "ACCESS_KEY_NEVER_USED",
                    f"User '{username}' has active key {key_id} "
                    f"created {age_days} days ago but never used. "
                    f"Consider disabling or deleting.",
                    resource_id=uid, resource_name=username
                ))

            # Active but unused for a long time
            if (
                last_used_days is not None
                and last_used_days > 90
            ):
                all_findings.append(finding(
                    "HIGH",
                    "ACCESS_KEY_STALE",
                    f"User '{username}' key {key_id} active but "
                    f"last used {last_used_days} days ago. "
                    f"Likely abandoned.",
                    resource_id=uid, resource_name=username
                ))

    return all_findings


# ─────────────────────────────────────────────────────────────
# 4. UNUSED ROLES (90+ days)
# ─────────────────────────────────────────────────────────────

def run_unused_role_checks(resources: list[dict]) -> list[dict]:
    all_findings = []

    for r in resources:
        if r.get("resource_type") != "iam_role":
            continue

        cfg       = r.get("configuration", {})
        role_name = r.get("resource_name", "unknown")
        rid       = r.get("resource_id", "")

        last_used    = parse_dt(cfg.get("last_used_date"))
        created      = parse_dt(cfg.get("created"))
        last_used_days = days_since(last_used)
        age_days       = days_since(created)

        # Never used
        if last_used is None:
            if age_days is not None and age_days > 30:
                all_findings.append(finding(
                    "MEDIUM",
                    "ROLE_NEVER_USED",
                    f"Role '{role_name}' has never been used "
                    f"(created {age_days} days ago). "
                    f"Consider removing if not needed.",
                    resource_id=rid, resource_name=role_name
                ))

        # Unused for a long time
        elif last_used_days is not None:
            if last_used_days >= ROLE_UNUSED_CRITICAL_DAYS:
                all_findings.append(finding(
                    "HIGH",
                    "ROLE_UNUSED_LONG",
                    f"Role '{role_name}' last used "
                    f"{last_used_days} days ago. "
                    f"Likely stale — review and remove.",
                    resource_id=rid, resource_name=role_name
                ))
            elif last_used_days >= ROLE_UNUSED_HIGH_DAYS:
                all_findings.append(finding(
                    "MEDIUM",
                    "ROLE_UNUSED",
                    f"Role '{role_name}' last used "
                    f"{last_used_days} days ago. "
                    f"Review if still required.",
                    resource_id=rid, resource_name=role_name
                ))

    return all_findings


# ─────────────────────────────────────────────────────────────
# 5. ROOT ACCOUNT CHECKS
# ─────────────────────────────────────────────────────────────

def run_root_account_checks(
    resources: list[dict],
    credential_report: list[dict] | None = None
) -> list[dict]:
    """
    Two sources:
    1. iam_account_summary  → AccountAccessKeysPresent, AccountMFAEnabled
    2. credential_report    → root row with exact last activity
    """
    all_findings = []

    # ── From account summary (your existing data) ──────────────
    for r in resources:
        if r.get("resource_type") != "iam_account_summary":
            continue

        summary = r.get("configuration", {}).get("summary_map", {})

        # Root access keys exist
        if summary.get("AccountAccessKeysPresent", 0) > 0:
            all_findings.append(finding(
                "CRITICAL",
                "ROOT_ACCESS_KEYS_EXIST",
                "Root account has active access keys. "
                "Root access keys should never exist. "
                "Delete them immediately.",
            ))

        # Root MFA not enabled
        if summary.get("AccountMFAEnabled", 0) == 0:
            all_findings.append(finding(
                "CRITICAL",
                "ROOT_MFA_DISABLED",
                "Root account does not have MFA enabled. "
                "This is the most critical IAM finding possible.",
            ))

    # ── From credential report (richer data, add to scanner) ───
    if credential_report:
        for row in credential_report:
            if row.get("user") != "<root_account>":
                continue

            # Root used recently
            last_activity = parse_dt(
                row.get("password_last_used")
                or row.get("access_key_1_last_used_date")
            )
            if last_activity:
                days_ago = days_since(last_activity)
                if days_ago is not None and days_ago <= 30:
                    all_findings.append(finding(
                        "CRITICAL",
                        "ROOT_ACCOUNT_RECENTLY_USED",
                        f"Root account was used {days_ago} days ago. "
                        f"Root should never be used for daily operations. "
                        f"Use IAM roles instead.",
                    ))

            # Root access key 1 active
            if row.get("access_key_1_active", "false").lower() == "true":
                all_findings.append(finding(
                    "CRITICAL",
                    "ROOT_ACCESS_KEY_ACTIVE",
                    "Root account access key 1 is active. Delete immediately.",
                ))

            # Root access key 2 active
            if row.get("access_key_2_active", "false").lower() == "true":
                all_findings.append(finding(
                    "CRITICAL",
                    "ROOT_ACCESS_KEY_ACTIVE",
                    "Root account access key 2 is active. Delete immediately.",
                ))

    return all_findings


# ─────────────────────────────────────────────────────────────
# 6. CROSS-ACCOUNT TRUST ANALYZER
# ─────────────────────────────────────────────────────────────

def run_cross_account_trust_checks(
    resources: list[dict],
    trusted_account_ids: list[str] | None = None
) -> list[dict]:
    """
    trusted_account_ids: list of your own AWS account IDs.
    Any account outside this list is flagged as external.
    """
    all_findings = []
    trusted = set(trusted_account_ids or [])

    for r in resources:
        if r.get("resource_type") != "iam_role":
            continue

        cfg       = r.get("configuration", {})
        role_name = r.get("resource_name", "unknown")
        rid       = r.get("resource_id", "")
        trust     = cfg.get("trust_policy", {})

        stmts = extract_policy_statements(trust)

        for stmt in stmts:
            effect    = stmt.get("Effect", "Allow")
            principal = stmt.get("Principal", {})
            condition = stmt.get("Condition", {})
            has_condition = bool(condition)

            if effect != "Allow":
                continue

            # Normalize principal
            aws_principals = []
            if isinstance(principal, str):
                # Principal: "*"
                aws_principals = [principal]
            elif isinstance(principal, dict):
                aws_val = principal.get("AWS", [])
                aws_principals = normalize_to_list(aws_val)

            for p in aws_principals:

                # Anyone can assume this role
                if p == "*":
                    all_findings.append(finding(
                        "CRITICAL",
                        "TRUST_POLICY_PUBLIC",
                        f"Role '{role_name}' trust policy allows "
                        f"Principal:* — ANYONE can assume this role. "
                        f"Immediate remediation required.",
                        resource_id=rid, resource_name=role_name
                    ))
                    continue

                # Extract account ID from principal ARN
                # Format: arn:aws:iam::123456789:root
                #         arn:aws:iam::123456789:role/SomeRole
                account_id = None
                if "arn:aws:iam::" in p:
                    parts = p.split(":")
                    # parts[4] is account id in a valid ARN
                    if len(parts) > 4:
                        account_id = parts[4]

                if account_id and trusted and account_id not in trusted:
                    sev = "HIGH" if not has_condition else "MEDIUM"
                    all_findings.append(finding(
                        sev,
                        "CROSS_ACCOUNT_TRUST",
                        f"Role '{role_name}' trusts external account "
                        f"{account_id}."
                        + (" No condition applied — any principal in that "
                           "account can assume this role."
                           if not has_condition
                           else " Condition exists but verify it's restrictive."),
                        resource_id=rid, resource_name=role_name
                    ))

                # ExternalId missing on cross-account trust (confused deputy)
                if (
                    account_id
                    and account_id not in (trusted or set())
                    and not has_condition
                ):
                    all_findings.append(finding(
                        "MEDIUM",
                        "CROSS_ACCOUNT_NO_EXTERNAL_ID",
                        f"Role '{role_name}' cross-account trust "
                        f"to {account_id} has no ExternalId condition. "
                        f"Vulnerable to confused deputy attacks.",
                        resource_id=rid, resource_name=role_name
                    ))

    return all_findings


# ─────────────────────────────────────────────────────────────
# 7. INLINE POLICY CHECKS ON USERS + ROLES
# ─────────────────────────────────────────────────────────────

def run_inline_policy_checks(resources: list[dict]) -> list[dict]:
    """
    Users and roles store inline policy DOCUMENTS in
    configuration.inline_policy_documents (add this to your scanner).
    Also flags existence of inline policies as a medium finding.
    """
    all_findings = []

    for r in resources:
        rtype = r.get("resource_type")
        if rtype not in ("iam_user", "iam_role"):
            continue

        cfg  = r.get("configuration", {})
        name = r.get("resource_name", "unknown")
        rid  = r.get("resource_id", "")

        # Flag inline policy existence (best practice violation)
        inline_names = cfg.get("inline_policies", [])
        if inline_names:
            all_findings.append(finding(
                "LOW",
                "INLINE_POLICY_EXISTS",
                f"{rtype} '{name}' has {len(inline_names)} inline "
                f"polic{'ies' if len(inline_names) > 1 else 'y'}: "
                f"{', '.join(inline_names)}. "
                f"Prefer managed policies for auditability.",
                resource_id=rid, resource_name=name
            ))

        # If you store the actual documents (after adding to scanner)
        inline_docs = cfg.get("inline_policy_documents", {})
        for policy_name, policy_doc in inline_docs.items():
            doc_findings = analyze_policy_document(
                policy_doc,
                policy_name=policy_name,
                attached_to=f"{rtype}:{name}"
            )
            all_findings.extend(doc_findings)

    return all_findings


# ─────────────────────────────────────────────────────────────
# 8. PERMISSIONS BOUNDARY CHECKER
# ─────────────────────────────────────────────────────────────

def run_permissions_boundary_checks(
    resources: list[dict]
) -> list[dict]:
    all_findings = []

    for r in resources:
        rtype = r.get("resource_type")
        if rtype not in ("iam_user", "iam_role"):
            continue

        cfg  = r.get("configuration", {})
        name = r.get("resource_name", "unknown")
        rid  = r.get("resource_id", "")

        # Skip service-linked roles — they don't need boundaries
        arn = r.get("arn", "")
        if "aws-service-role" in arn:
            continue

        has_boundary = cfg.get("has_permissions_boundary", False)

        # Only flag roles/users with admin or dangerous permissions
        has_admin = cfg.get("has_admin_access", False)

        if has_admin and not has_boundary:
            all_findings.append(finding(
                "HIGH",
                "ADMIN_NO_PERMISSIONS_BOUNDARY",
                f"{rtype} '{name}' has admin-level access "
                f"but no permissions boundary set. "
                f"Permissions boundaries limit maximum effective permissions.",
                resource_id=rid, resource_name=name
            ))

    return all_findings


# ─────────────────────────────────────────────────────────────
# MAIN ENTRY POINT — run everything on your DB resources
# ─────────────────────────────────────────────────────────────

async def run_iam_analyzer(
    # resources: list[dict],
    # trusted_account_ids: list[str] | None = None,
    # credential_report: list[dict] | None = None,
    db: AsyncSession,
    cloud_account_id: str,
    organization_id: str
) -> dict:
    """
    Pass in all IAM resources fetched from your DB.
    Returns structured findings grouped by check type.

    Usage:
        iam_resources = db.get_resources_by_service("iam")
        results = run_iam_analyzer(
            resources=iam_resources,
            trusted_account_ids=["123456789012", "987654321098"],
            credential_report=fetch_credential_report(client)  # optional
        )
    """
    all_findings = []
    
    all_resources = await db.execute(
        select(Resources)
        .where(Resources.cloud_account_id == cloud_account_id, Resources.organization_id == organization_id)
    )
    
    resources = [
        resource_to_dict(r)
        for r in all_resources.scalars().all()
    ]

    checks = [
        ("policy_checks",      run_policy_checks(resources)),
        ("access_key_checks",  run_access_key_checks(resources)),
        ("unused_role_checks", run_unused_role_checks(resources)),
        # ("root_checks",        run_root_account_checks(resources, credential_report)),
        # ("cross_account",      run_cross_account_trust_checks(resources, trusted_account_ids)),
        ("inline_policies",    run_inline_policy_checks(resources)),
        ("boundary_checks",    run_permissions_boundary_checks(resources)),
    ]

    summary = {}
    for check_name, findings in checks:
        summary[check_name] = len(findings)
        all_findings.extend(findings)

    # Severity summary
    severity_count = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in all_findings:
        sev = f.get("severity", "LOW")
        severity_count[sev] = severity_count.get(sev, 0) + 1

    logger.info(
        f"IAM Analyzer complete — "
        f"{len(all_findings)} findings | "
        f"CRITICAL:{severity_count['CRITICAL']} "
        f"HIGH:{severity_count['HIGH']} "
        f"MEDIUM:{severity_count['MEDIUM']} "
        f"LOW:{severity_count['LOW']}"
    )

    return {
        "total_findings":  len(all_findings),
        "severity_summary": severity_count,
        "checks_summary":  summary,
        "findings":        all_findings,
    }

def resource_to_dict(r):
    return {
        "resource_type": r.resource_type,
        "resource_name": r.resource_name,
        "resource_id": r.resource_id,
        "arn": r.arn,
        "configuration": r.configuration or {},
        "tags": r.tags or {},
    }