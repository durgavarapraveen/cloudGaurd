from typing import List, Dict, Any


# resource_type → function that returns (is_unencrypted: bool, detail: str)
ENCRYPTION_CHECKS: Dict[str, Any] = {

    "ec2_volume": lambda c: (
        not c.get("encrypted"),
        "EBS volume is not encrypted"
    ),

    "rds_instance": lambda c: (
        not c.get("storage_encrypted", True),
        "RDS instance storage is not encrypted"
    ),

    "rds_cluster": lambda c: (
        not c.get("storage_encrypted", True),
        "RDS cluster storage is not encrypted"
    ),

    "s3_bucket": lambda c: (
        not c.get("server_side_encryption_enabled", False),
        "S3 bucket has no default encryption (SSE-S3 or SSE-KMS)"
    ),

    "dynamodb_table": lambda c: (
        c.get("sse_description", {}).get("status") not in ("ENABLED", "ENABLING"),
        "DynamoDB table is not using CMK encryption"
    ),

    "elasticache_cluster": lambda c: (
        not c.get("at_rest_encryption_enabled"),
        "ElastiCache cluster at-rest encryption is disabled"
    ),

    "elasticache_replication_group": lambda c: (
        not c.get("at_rest_encryption_enabled")
        or not c.get("transit_encryption_enabled"),
        "ElastiCache replication group missing at-rest or in-transit encryption"
    ),

    "opensearch_domain": lambda c: (
        not c.get("encryption_at_rest_options", {}).get("enabled"),
        "OpenSearch domain encryption at rest is disabled"
    ),

    "redshift_cluster": lambda c: (
        not c.get("encrypted"),
        "Redshift cluster is not encrypted"
    ),

    "sqs_queue": lambda c: (
        not c.get("kms_master_key_id") and not c.get("sqs_managed_sse_enabled"),
        "SQS queue has no server-side encryption"
    ),

    "sns_topic": lambda c: (
        not c.get("kms_master_key_id"),
        "SNS topic has no KMS encryption"
    ),

    "kinesis_stream": lambda c: (
        c.get("encryption_type", "NONE") == "NONE",
        "Kinesis stream encryption is disabled"
    ),

    "efs_file_system": lambda c: (
        not c.get("encrypted"),
        "EFS file system is not encrypted"
    ),

    "cloudwatch_log_group": lambda c: (
        not c.get("kms_key_id"),
        "CloudWatch Log Group has no KMS key"
    ),

    "secretsmanager_secret": lambda c: (
        not c.get("kms_key_id")
        or c.get("kms_key_id") == "aws/secretsmanager",
        "Secret is using default AWS managed key, not a CMK"
    ),

    "backup_vault": lambda c: (
        not c.get("encryption_key_arn"),
        "Backup vault has no KMS encryption key"
    ),
}


def _severity(resource_type: str, config: Dict) -> str:
    """Escalate severity if resource is also publicly accessible."""
    is_public = config.get("publicly_accessible") or config.get("public_ip")
    if resource_type in ("s3_bucket",) and config.get("bucket_acl_public"):
        return "CRITICAL"
    return "CRITICAL" if is_public else "HIGH"


def run_encryption_check(resources: List[Any]) -> List[Dict]:
    """
    Reads all stored resources from DB.
    Returns findings for any resource missing encryption.
    """
    findings = []

    for r in resources:
        checker = ENCRYPTION_CHECKS.get(r.resource_type)
        if not checker:
            continue

        config = r.configuration or {}

        try:
            is_unencrypted, detail = checker(config)
        except Exception:
            continue

        if is_unencrypted:
            findings.append({
                "check":         "UNENCRYPTED_RESOURCE",
                "resource_type": r.resource_type,
                "resource_id":   r.resource_id,
                "resource_name": r.resource_name,
                "region":        r.region,
                "service":       r.service,
                "severity":      _severity(r.resource_type, config),
                "detail":        detail,
                "kms_key_id":    config.get("kms_key_id"),
                "remediation":   _remediation(r.resource_type, r.resource_id),
            })

    return findings


def _remediation(resource_type: str, resource_id: str) -> str:
    tips = {
        "ec2_volume":       f"Snapshot {resource_id}, restore as encrypted volume.",
        "rds_instance":     f"Snapshot {resource_id}, restore with StorageEncrypted=true.",
        "s3_bucket":        f"Enable SSE-KMS or SSE-S3 on bucket {resource_id}.",
        "dynamodb_table":   f"Enable CMK encryption on table {resource_id}.",
        "sqs_queue":        f"Enable SQS managed SSE or KMS key on {resource_id}.",
        "sns_topic":        f"Attach KMS key to SNS topic {resource_id}.",
        "kinesis_stream":   f"Enable KMS encryption on stream {resource_id}.",
        "efs_file_system":  f"EFS encryption can only be set at creation. Migrate data.",
        "redshift_cluster": f"Enable encryption on cluster {resource_id} (requires restore).",
        "opensearch_domain": f"Enable encryption at rest on domain {resource_id}.",
    }
    return tips.get(resource_type, f"Enable encryption on {resource_id}.")