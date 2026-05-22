import logging

from scanners.AWS.utils import safe_call

logger = logging.getLogger(__name__)

def scan_s3(session):
    logger.info("Scanning S3")
    client = session.client("s3")

    buckets_resp = safe_call(client.list_buckets)
    if not buckets_resp:
        return []

    results = []

    for bucket in buckets_resp.get("Buckets", []):
        name = bucket["Name"]

        location = safe_call(client.get_bucket_location, Bucket=name)
        region = "us-east-1"
        if location:
            region = location.get("LocationConstraint") or "us-east-1"

        enc = safe_call(client.get_bucket_encryption, Bucket=name)
        encryption = enc.get("ServerSideEncryptionConfiguration") if enc else None

        ver = safe_call(client.get_bucket_versioning, Bucket=name) or {}
        versioning = {k: v for k, v in ver.items() if k != "ResponseMetadata"}  # ✅

        pub = safe_call(client.get_public_access_block, Bucket=name)
        public_block = pub.get("PublicAccessBlockConfiguration") if pub else None

        log = safe_call(client.get_bucket_logging, Bucket=name)
        logging_cfg = log.get("LoggingEnabled") if log else None

        acl = safe_call(client.get_bucket_acl, Bucket=name)
        grants = acl.get("Grants", []) if acl else []

        tags_resp = safe_call(client.get_bucket_tagging, Bucket=name)
        tags = tags_resp.get("TagSet", []) if tags_resp else []

        lifecycle = safe_call(client.get_bucket_lifecycle_configuration, Bucket=name)
        lifecycle_rules = lifecycle.get("Rules", []) if lifecycle else []

        results.append({
            "service": "s3",
            "resource_type": "s3_bucket",
            "resource_id": name,
            "resource_name": name,
            "arn": f"arn:aws:s3:::{name}",
            "region": region,
            "configuration": {
                "encryption": encryption,
                "versioning": versioning,      # ✅ ResponseMetadata stripped
                "public_access_block": public_block,
                "logging": logging_cfg,
                "acl": grants,
                "lifecycle": lifecycle_rules
            },
            "tags": tags
            # ✅ removed "created" — CreationDate is a datetime and doesn't 
            #    affect config, just adds noise to hash
        })

    logger.info(f"S3 → {len(results)} buckets")
    return results