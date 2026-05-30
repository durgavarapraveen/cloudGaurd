
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request, HTTPException
from sqlalchemy import select

from repository.cloudAccount_repository import getCloudAccountwithIdentifier_Repository

from models.resources_model import Resources
from typing import List, Dict, Any
from collections import defaultdict


from analyzer.public_inventory_analyzer import run_public_inventory
from analyzer.encryption_analyzer import run_encryption_check
from analyzer.port_analyzer import run_port_analysis


async def analyze_resource(db: AsyncSession, cloudIdentifier: str, request: Request):
    cloud = await getCloudAccountwithIdentifier_Repository(db=db, indentifier=cloudIdentifier, request=request)
    
    if not cloud:
        raise HTTPException(status_code=404, detail="No Cloud Account Found")
    
    resources = await db.execute(
        select(Resources)
        .where(Resources.cloud_account_id == cloud.id)
    )
    
    resources = resources.scalars().all()
    
    report = run_all_checks(resources)

    # optional: print to server logs
    print_report(report)

    return report



def run_all_checks(resources: List[Any]) -> Dict:
    """
    Pass in your DB resources list once.
    All three analyzers consume the same list.
    """
    public_findings     = run_public_inventory(resources)
    port_findings       = run_port_analysis(resources)
    encryption_findings = run_encryption_check(resources)

    all_findings = public_findings + port_findings + encryption_findings

    # ── severity summary ─────────────────────────────────────────
    severity_counts = defaultdict(int)
    for f in all_findings:
        severity_counts[f["severity"]] += 1

    # ── per-resource-type breakdown ──────────────────────────────
    type_breakdown = defaultdict(int)
    for f in all_findings:
        type_breakdown[f["resource_type"]] += 1

    return {
        "summary": {
            "total_resources_scanned": len(resources),
            "total_findings":          len(all_findings),
            "severity_breakdown": {
                "CRITICAL": severity_counts["CRITICAL"],
                "HIGH":     severity_counts["HIGH"],
                "MEDIUM":   severity_counts["MEDIUM"],
                "LOW":      severity_counts["LOW"],
            },
            "by_check": {
                "public_resources":     len(public_findings),
                "exposed_ports":        len(port_findings),
                "unencrypted_resources": len(encryption_findings),
            },
        },
        "type_breakdown":       dict(type_breakdown),
        "public_findings":      public_findings,
        "port_findings":        port_findings,
        "encryption_findings":  encryption_findings,
        "all_findings":         all_findings,
    }


def print_report(report: Dict):
    s = report["summary"]
    print("\n" + "═" * 64)
    print("  SECURITY SCAN RESULTS")
    print("═" * 64)
    print(f"  Resources scanned     : {s['total_resources_scanned']}")
    print(f"  Total findings        : {s['total_findings']}")
    print(f"  ├─ CRITICAL           : {s['severity_breakdown']['CRITICAL']}")
    print(f"  ├─ HIGH               : {s['severity_breakdown']['HIGH']}")
    print(f"  └─ MEDIUM             : {s['severity_breakdown']['MEDIUM']}")
    print(f"\n  By check type:")
    print(f"  ├─ Public resources   : {s['by_check']['public_resources']}")
    print(f"  ├─ Exposed ports      : {s['by_check']['exposed_ports']}")
    print(f"  └─ Unencrypted        : {s['by_check']['unencrypted_resources']}")
    print("═" * 64)

    sections = [
        ("PUBLIC RESOURCES",      report["public_findings"]),
        ("EXPOSED PORTS",         report["port_findings"]),
        ("UNENCRYPTED RESOURCES", report["encryption_findings"]),
    ]

    for title, findings in sections:
        if not findings:
            continue
        print(f"\n  {title}")
        print("  " + "─" * 60)
        for f in sorted(findings, key=lambda x: x["severity"]):
            print(
                f"  [{f['severity']:8}] "
                f"{f['resource_type']:<30} "
                f"{f['resource_id']:<30} "
                f"{f['region']}"
            )
            print(f"             → {f['detail']}")

    print()