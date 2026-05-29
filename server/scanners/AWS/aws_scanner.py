import boto3
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

import json
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse

from scanners.AWS.utils import safe_call

# Service scanners
from scanners.AWS.Individual_resources.rds import scan_rds
from scanners.AWS.Individual_resources.s3 import scan_s3
from scanners.AWS.Individual_resources.ec2 import scan_ec2
from scanners.AWS.Individual_resources.iam import scan_iam
from scanners.AWS.Individual_resources.awsacm import scan_acm
from scanners.AWS.Individual_resources.efs import scan_efs
from scanners.AWS.Individual_resources.ebs import scan_ebs
from scanners.AWS.Individual_resources.resourceAccessManager import scan_ram
from scanners.AWS.Individual_resources.privateLink import scan_privatelink
from scanners.AWS.Individual_resources.awskms import scan_kms
from scanners.AWS.Individual_resources.ecr import scan_ecr
from scanners.AWS.Individual_resources.ecs import scan_ecs
from scanners.AWS.Individual_resources.elasticCache import scan_elasticache
from scanners.AWS.Individual_resources.route53 import scan_route53
from scanners.AWS.Individual_resources.transitGateway import scan_transit_gateway

from scanners.AWS.Individual_resources.vpc_scanner import scan_vpc
from scanners.AWS.Individual_resources.subnet_scanner import scan_subnets
from scanners.AWS.Individual_resources.security_group_scanner import scan_security_groups
from scanners.AWS.Individual_resources.lambda_scanner import scan_lambda
from scanners.AWS.Individual_resources.elb_alb_nld_scanner import scan_elb
from scanners.AWS.Individual_resources.cloud_formation_scanner import scan_cloudformation

from utils.aws_session import get_session


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# SESSION
# ─────────────────────────────────────────────

services_all = ["s3", "iam", "ec2", "rds", "acm", "efs", "ebs", "ram", "privatelink", "kms", "ecr", "ecs", "elasticache", "route53", "transitGateway"
                # "vpc", "sg",
                "subnet", "cloud_formation", "elb_alb_nlb", "lambda"
                ]


# ─────────────────────────────────────────────
# MAIN COLLECTOR
# ─────────────────────────────────────────────

async def collect_all(session, services=None, regions=None):
    """
    Collect AWS resources for requested services.

    :param services: List of services to scan, e.g., ["s3", "ec2"], or None/["ALL"] for all.
    :param regions: List of regions to scan, default is AWS_DEFAULT_REGION.
    """

    if regions is None:
        regions = ["ap-south-1"]
        
    if services is None or "ALL" in services:
        services = services_all
    
    # Identity check
    sts = session.client("sts")
    identity = safe_call(sts.get_caller_identity)
    account_id = identity.get("Account") if identity else "unknown"
    

    tasks = []

    # Global services
    if "s3" in services:
        tasks.append(("s3", scan_s3, (session,)))
    if "iam" in services:
        tasks.append(("iam", scan_iam, (session,)))

    # Regional services
    for region in regions:
        if "ec2" in services:
            tasks.append((f"ec2_{region}", scan_ec2, (session, region)))
        if "rds" in services:
            tasks.append((f"rds_{region}", scan_rds, (session, region)))
        if "ecr" in services:
            tasks.append((f"ecr_{region}", scan_ecr, (session, region)))
        if "acm" in services:
            tasks.append((f"acm_{region}", scan_acm, (session, region)))
        
        if "efs" in services:
            tasks.append((f"efs_{region}", scan_efs, (session, region)))
            
        if "ebs" in services:
            tasks.append((f"ebs_{region}", scan_ebs, (session, region)))
            
        if "ram" in services:
            tasks.append((f"ram_{region}", scan_ram, (session, region)))
            
        if "privatelink" in services:
            tasks.append((f"privatelink_{region}", scan_privatelink, (session, region)))
            
        if "kms" in services:
            tasks.append((f"kms_{region}", scan_kms, (session, region)))
            
        
        if "ecs" in services:
            tasks.append((f"ecs_{region}", scan_ecs, (session, region)))
            
        if "elasticache" in services:
            tasks.append((f"elasticache_{region}", scan_elasticache, (session, region)))
            
        if "route53" in services:
            tasks.append((f"route53_{region}", scan_route53, (session,)))
            
        if "transitGateway" in services:
            tasks.append((f"transitGateway_{region}", scan_transit_gateway, (session, region)))
            
        # if "vpc" in services:
        #     tasks.append((f"vpc_{region}", scan_vpc, (session, region)))
            
        # if "sg" in services:
        #     tasks.append((f"sg_{region}", scan_security_groups, (session, region)))
        
        # if "subnet" in services:
        #     tasks.append((f"subnet_{region}", scan_subnets, (session, region)))
        
        if "cloud_formation" in services:
            tasks.append((f"cloud_formation_{region}", scan_cloudformation, (session, region)))
        
        if "lambda" in services:
            tasks.append((f"lambda_{region}", scan_lambda, (session, region)))
        
        if "elb_nlb_alb" in services:
            tasks.append((f"elb_nlb_alb_{region}", scan_elb, (session, region)))
                
    raw_results = {}

    with ThreadPoolExecutor(max_workers=10) as executor:

        future_map = {
            executor.submit(fn, *args): name
            for name, fn, args in tasks
        }

        for future in as_completed(future_map):
            name = future_map[future]
            try:
                raw_results[name] = future.result()
            except Exception as e:
                logger.error(f"{name} failed : {str(e)}")
                raw_results[name] = []

    # Merge results
    merged = {svc: [] for svc in services}

    for svc in ["s3", "iam"]:
        if svc in services:
            merged[svc] = raw_results.get(svc, [])
    for region in regions:
        if "ec2" in services:
            merged["ec2"] += raw_results.get(f"ec2_{region}", [])
        if "rds" in services:
            merged["rds"] += raw_results.get(f"rds_{region}", [])
        if "ecr" in services:
            merged["ecr"] += raw_results.get(f"ecr_{region}", [])
        if "acm" in services:
            merged["acm"] += raw_results.get(f"acm_{region}", [])
        if "efs" in services:
            merged["efs"] += raw_results.get(f"efs_{region}", [])
        if "ebs" in services:
            merged["ebs"] += raw_results.get(f"ebs_{region}", [])
        if "ram" in services:
            merged["ram"] += raw_results.get(f"ram_{region}", [])
        if "privatelink" in services:
            merged["privatelink"] += raw_results.get(f"privatelink_{region}", [])
        if "kms" in services:
            merged["kms"] += raw_results.get(f"kms_{region}", [])
        if "ecs" in services:
            merged["ecs"] += raw_results.get(f"ecs_{region}", [])
        if "elasticache" in services:
            merged["elasticache"] += raw_results.get(f"elasticache_{region}", [])
        if "route53" in services:
            merged["route53"] += raw_results.get(f"route53_{region}", [])
        if "transitGateway" in services:
            merged["transitGateway"] += raw_results.get(f"transitGateway_{region}", [])
        # if "vpc" in services:
        #     merged["vpc"] += raw_results.get(f"vpc_{region}", [])
        # if "subnet" in services:
        #     merged["subnet"] += raw_results.get(f"subnet_{region}", [])
        # if "sg" in services:
        #     merged["sg"] += raw_results.get(f"sg_{region}", [])
        if "lambda" in services:
            merged["lambda"] += raw_results.get(f"lambda_{region}", [])
        if "elb_alb_nlb" in services:
            merged["elb_alb_nlb"] += raw_results.get(f"elb_alb_nlb_{region}", [])
        if "cloud_formation" in services:
            merged["cloud_formation"] += raw_results.get(f"cloud_formation_{region}", [])
        

    # Summary
    by_service = {svc: len(merged[svc]) for svc in merged if svc in services}
    total = sum(by_service.values())

    result = {
        "account_id": account_id,
        "scan_metadata": {
            "account_id": account_id,
            "regions": regions,
            "scanned_at": datetime.now(timezone.utc).isoformat(),
            "scanner": "CloudGuard"
        },
        "resources": {svc: merged[svc] for svc in services},
        "summary": {
            "total_resources": total,
            "by_service": by_service
        }
    }

    return result

def flatten_value(val):
    """
    Converts any value that pandas cannot write to an Excel cell
    into a plain string.
 
    Rules:
      - dict  → JSON string   e.g. {"Key": "env"} → '{"Key": "env"}'
      - list  → JSON string   e.g. ["sg-123"]     → '["sg-123"]'
      - None  → empty string
      - bool, int, float, str → left as-is (Excel handles these natively)
    """
    if val is None:
        return ""
    if isinstance(val, (dict, list)):
        return json.dumps(val, default=str)
    return val
 
 
def flatten_record(record: dict) -> dict:
    """
    Applies flatten_value to every value in a resource dict.
    Does NOT recurse — AWS resource dicts are one level deep after
    the scanner runs, so a single pass is enough.
    """
    return {k: flatten_value(v) for k, v in record.items()}


async def export_resources(regions=None, services=None):
 
    result = await collect_all(regions, services)
 
    resources = result["resources"]
    summary   = result["summary"]
 
    output = BytesIO()
 
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
 
        # ── Summary sheet ──────────────────────────────────────
        summary_df = pd.DataFrame(
            list(summary["by_service"].items()),
            columns=["Service", "Resource Count"]
        )
        summary_df.loc[len(summary_df)] = [
            "TOTAL",
            summary["total_resources"]
        ]
        summary_df.to_excel(
            writer,
            sheet_name="Summary",
            index=False
        )
 
        # ── One sheet per service ──────────────────────────────
        for service, data in resources.items():
 
            if not data:
                continue
 
            # FIX — flatten every record before passing to DataFrame
            # This converts dicts/lists in cells to JSON strings
            flat_data = [flatten_record(record) for record in data]
 
            df = pd.DataFrame(flat_data)
 
            # Reorder important columns first
            priority_cols = [
                "resource_id",
                "resource_name",
                "region",
                "resource_type",
            ]
            cols = (
                priority_cols +
                [c for c in df.columns if c not in priority_cols]
            )
            df = df[[c for c in cols if c in df.columns]]
 
            # Excel sheet name max length is 31 chars
            sheet_name = service.upper()[:31]
 
            df.to_excel(
                writer,
                sheet_name=sheet_name,
                index=False
            )
 
    output.seek(0)
 
    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
                "attachment; filename=cloudguard_resources.xlsx"
        }
    )
