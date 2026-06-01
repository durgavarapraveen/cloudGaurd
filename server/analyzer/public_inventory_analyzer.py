from typing import List, Dict, Any


PUBLIC_RESOURCE_TYPES = {
    # EC2
    "ec2_instance": lambda c: c.get("publicly_accessible") or bool(c.get("public_ip")),

    # RDS
    "rds_instance": lambda c: c.get("publicly_accessible", False),

    # S3
    "s3_bucket": lambda c: (
        c.get("public_access_block", {}).get("block_public_acls") is False
        or c.get("bucket_acl_public", False)
    ),

    # ELB / ALB / NLB
    "elbv2_load_balancer": lambda c: c.get("scheme") == "internet-facing",
    "elb_load_balancer":   lambda c: c.get("scheme") == "internet-facing",

    # Lambda
    "lambda_function": lambda c: (
        c.get("function_url_enabled") and c.get("function_url_auth_type") == "NONE"
    ),

    # RDS Aurora / Cluster
    "rds_cluster": lambda c: c.get("publicly_accessible", False),

    # Redshift
    "redshift_cluster": lambda c: c.get("publicly_accessible", False),

    # OpenSearch
    "opensearch_domain": lambda c: not c.get("vpc_options"),

    # ElastiCache
    "elasticache_cluster": lambda c: c.get("transit_encryption_enabled") is False,
}


def run_public_inventory(resources: List[Any]) -> List[Dict]:
    """
    Input  : list of ORM Resource objects from DB
    Output : list of findings for publicly exposed resources
    """
    findings = []

    for r in resources:
        resource_type = r.resource_type
        config        = r.configuration or {}

        checker = PUBLIC_RESOURCE_TYPES.get(resource_type)
        if not checker:
            continue

        if checker(config):
            findings.append({
                "id": r.id,
                "check":         "PUBLIC_RESOURCE",
                "resource_type": resource_type,
                "resource_id":   r.resource_id,
                "resource_name": r.resource_name,
                "region":        r.region,
                "service":       r.service,
                "severity":      "HIGH",
                "detail":        f"{resource_type} is publicly accessible",
                "config_snapshot": {
                    "public_ip":  config.get("public_ip"),
                    "public_dns": config.get("public_dns"),
                    "scheme":     config.get("scheme"),
                },
            })

    return findings