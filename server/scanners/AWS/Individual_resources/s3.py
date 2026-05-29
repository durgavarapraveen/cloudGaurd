import logging

from scanners.AWS.utils import safe_call

logger = logging.getLogger(__name__)


def scan_s3(session):


    client = session.client("s3")

    results = []

    buckets_resp = safe_call(
        client.list_buckets
    )

    if not buckets_resp:

        return results

    for bucket in buckets_resp.get(
        "Buckets",
        []
    ):

        bucket_name = bucket.get("Name")

        findings = []

        # ─────────────────────────────
        # REGION
        # ─────────────────────────────

        location_resp = safe_call(
            client.get_bucket_location,
            Bucket=bucket_name
        )

        region = "us-east-1"

        if location_resp:

            region = (
                location_resp.get(
                    "LocationConstraint"
                )
                or "us-east-1"
            )

        # Regional client
        regional_client = session.client(
            "s3",
            region_name=region
        )

        # ─────────────────────────────
        # ENCRYPTION
        # ─────────────────────────────

        encryption_resp = safe_call(
            regional_client.get_bucket_encryption,
            Bucket=bucket_name
        )

        encryption = (
            encryption_resp.get(
                "ServerSideEncryptionConfiguration"
            )
            if encryption_resp else None
        )

        if not encryption:

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Bucket encryption disabled"
            })

        # ─────────────────────────────
        # VERSIONING
        # ─────────────────────────────

        versioning_resp = safe_call(
            regional_client.get_bucket_versioning,
            Bucket=bucket_name
        ) or {}

        versioning = {

            k: v

            for k, v in versioning_resp.items()

            if k != "ResponseMetadata"
        }

        if versioning.get("Status") != "Enabled":

            findings.append({

                "severity":
                    "MEDIUM",

                "issue":
                    "Bucket versioning disabled"
            })

        # ─────────────────────────────
        # PUBLIC ACCESS BLOCK
        # ─────────────────────────────

        public_access_resp = safe_call(
            regional_client.get_public_access_block,
            Bucket=bucket_name
        )

        public_access_block = (

            public_access_resp.get(
                "PublicAccessBlockConfiguration"
            )

            if public_access_resp else None
        )

        if not public_access_block:

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Public access block not configured"
            })

        else:

            if not all([

                public_access_block.get(
                    "BlockPublicAcls",
                    False
                ),

                public_access_block.get(
                    "IgnorePublicAcls",
                    False
                ),

                public_access_block.get(
                    "BlockPublicPolicy",
                    False
                ),

                public_access_block.get(
                    "RestrictPublicBuckets",
                    False
                )
            ]):

                findings.append({

                    "severity":
                        "HIGH",

                    "issue":
                        "Bucket allows potential public access"
                })

        # ─────────────────────────────
        # ACL
        # ─────────────────────────────

        acl_resp = safe_call(
            regional_client.get_bucket_acl,
            Bucket=bucket_name
        )

        acl_grants = (
            acl_resp.get(
                "Grants",
                []
            )
            if acl_resp else []
        )

        for grant in acl_grants:

            grantee = grant.get(
                "Grantee",
                {}
            )

            uri = grantee.get("URI", "")

            if (

                "AllUsers" in uri
                or
                "AuthenticatedUsers" in uri
            ):

                findings.append({

                    "severity":
                        "HIGH",

                    "issue":
                        "Bucket ACL grants public access"
                })

        # ─────────────────────────────
        # BUCKET POLICY
        # ─────────────────────────────

        policy_resp = safe_call(
            regional_client.get_bucket_policy,
            Bucket=bucket_name
        )

        bucket_policy = (
            policy_resp.get("Policy")
            if policy_resp else None
        )

        policy_status_resp = safe_call(
            regional_client.get_bucket_policy_status,
            Bucket=bucket_name
        )

        policy_public = (

            policy_status_resp.get(
                "PolicyStatus",
                {}
            ).get("IsPublic")

            if policy_status_resp else None
        )

        if policy_public:

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Bucket policy is public"
            })

        # ─────────────────────────────
        # LOGGING
        # ─────────────────────────────

        logging_resp = safe_call(
            regional_client.get_bucket_logging,
            Bucket=bucket_name
        )

        logging_config = (

            logging_resp.get(
                "LoggingEnabled"
            )

            if logging_resp else None
        )

        if not logging_config:

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "Access logging disabled"
            })

        # ─────────────────────────────
        # TAGS
        # ─────────────────────────────

        tags_resp = safe_call(
            regional_client.get_bucket_tagging,
            Bucket=bucket_name
        )

        tags = (
            tags_resp.get(
                "TagSet",
                []
            )
            if tags_resp else []
        )

        # ─────────────────────────────
        # LIFECYCLE
        # ─────────────────────────────

        lifecycle_resp = safe_call(
            regional_client.get_bucket_lifecycle_configuration,
            Bucket=bucket_name
        )

        lifecycle_rules = (

            lifecycle_resp.get(
                "Rules",
                []
            )

            if lifecycle_resp else []
        )

        # ─────────────────────────────
        # WEBSITE HOSTING
        # ─────────────────────────────

        website_resp = safe_call(
            regional_client.get_bucket_website,
            Bucket=bucket_name
        )

        website_config = (
            website_resp
            if website_resp else None
        )

        # ─────────────────────────────
        # CORS
        # ─────────────────────────────

        cors_resp = safe_call(
            regional_client.get_bucket_cors,
            Bucket=bucket_name
        )

        cors_rules = (
            cors_resp.get(
                "CORSRules",
                []
            )
            if cors_resp else []
        )

        # ─────────────────────────────
        # OBJECT LOCK
        # ─────────────────────────────

        object_lock_resp = safe_call(
            regional_client.get_object_lock_configuration,
            Bucket=bucket_name
        )

        object_lock = (
            object_lock_resp.get(
                "ObjectLockConfiguration"
            )
            if object_lock_resp else None
        )

        # ─────────────────────────────
        # OWNERSHIP CONTROLS
        # ─────────────────────────────

        ownership_resp = safe_call(
            regional_client.get_bucket_ownership_controls,
            Bucket=bucket_name
        )

        ownership_controls = (
            ownership_resp.get(
                "OwnershipControls",
                {}
            ).get(
                "Rules",
                []
            )
            if ownership_resp else []
        )

        # ─────────────────────────────
        # REPLICATION
        # ─────────────────────────────

        replication_resp = safe_call(
            regional_client.get_bucket_replication,
            Bucket=bucket_name
        )

        replication = (
            replication_resp.get(
                "ReplicationConfiguration"
            )
            if replication_resp else None
        )

        # ─────────────────────────────
        # ACCELERATION
        # ─────────────────────────────

        acceleration_resp = safe_call(
            regional_client.get_bucket_accelerate_configuration,
            Bucket=bucket_name
        )

        acceleration_status = (
            acceleration_resp.get("Status")
            if acceleration_resp else None
        )

        # ─────────────────────────────
        # REQUEST PAYMENT
        # ─────────────────────────────

        payment_resp = safe_call(
            regional_client.get_bucket_request_payment,
            Bucket=bucket_name
        )

        payer = (
            payment_resp.get("Payer")
            if payment_resp else None
        )

        # ─────────────────────────────
        # INTELLIGENT TIERING
        # ─────────────────────────────

        tiering_resp = safe_call(
            regional_client.list_bucket_intelligent_tiering_configurations,
            Bucket=bucket_name
        )

        intelligent_tiering = (
            tiering_resp.get(
                "IntelligentTieringConfigurationList",
                []
            )
            if tiering_resp else []
        )

        # ─────────────────────────────
        # INVENTORY CONFIGS
        # ─────────────────────────────

        inventory_resp = safe_call(
            regional_client.list_bucket_inventory_configurations,
            Bucket=bucket_name
        )

        inventory_configurations = (
            inventory_resp.get(
                "InventoryConfigurationList",
                []
            )
            if inventory_resp else []
        )

        # ─────────────────────────────
        # METRICS CONFIGS
        # ─────────────────────────────

        metrics_resp = safe_call(
            regional_client.list_bucket_metrics_configurations,
            Bucket=bucket_name
        )

        metrics_configurations = (
            metrics_resp.get(
                "MetricsConfigurationList",
                []
            )
            if metrics_resp else []
        )

        # ─────────────────────────────
        # ANALYTICS CONFIGS
        # ─────────────────────────────

        analytics_resp = safe_call(
            regional_client.list_bucket_analytics_configurations,
            Bucket=bucket_name
        )

        analytics_configurations = (
            analytics_resp.get(
                "AnalyticsConfigurationList",
                []
            )
            if analytics_resp else []
        )

        # ─────────────────────────────
        # NOTIFICATION CONFIG
        # ─────────────────────────────

        notification_resp = safe_call(
            regional_client.get_bucket_notification_configuration,
            Bucket=bucket_name
        )

        notifications = (
            notification_resp
            if notification_resp else {}
        )

        # ─────────────────────────────
        # RESOURCE
        # ─────────────────────────────

        resource = {

            "service": "s3",

            "resource_type":
                "s3_bucket",

            "resource_id":
                bucket_name,

            "resource_name":
                bucket_name,

            "arn":
                f"arn:aws:s3:::{bucket_name}",

            "region":
                region,

            "configuration": {

                # Basic
                "creation_date":
                    bucket.get(
                        "CreationDate"
                    ).isoformat()
                    if bucket.get(
                        "CreationDate"
                    ) else None,

                # Encryption
                "encryption":
                    encryption,

                # Versioning
                "versioning":
                    versioning,

                # Public Access
                "public_access_block":
                    public_access_block,

                "bucket_policy":
                    bucket_policy,

                "policy_public":
                    policy_public,

                "acl":
                    acl_grants,

                # Logging
                "logging":
                    logging_config,

                # Lifecycle
                "lifecycle_rules":
                    lifecycle_rules,

                # Website
                "website_configuration":
                    website_config,

                # CORS
                "cors_rules":
                    cors_rules,

                # Object Lock
                "object_lock":
                    object_lock,

                # Ownership
                "ownership_controls":
                    ownership_controls,

                # Replication
                "replication":
                    replication,

                # Transfer Acceleration
                "transfer_acceleration":
                    acceleration_status,

                # Billing
                "request_payment":
                    payer,

                # Notifications
                "notifications":
                    notifications,

                # Intelligent Tiering
                "intelligent_tiering":
                    intelligent_tiering,

                # Inventory
                "inventory_configurations":
                    inventory_configurations,

                # Metrics
                "metrics_configurations":
                    metrics_configurations,

                # Analytics
                "analytics_configurations":
                    analytics_configurations,

                # Derived
                "encrypted":
                    encryption is not None,

                "versioning_enabled":
                    versioning.get("Status")
                    == "Enabled",

                "public_access_block_enabled":
                    bool(public_access_block),

                "logging_enabled":
                    logging_config is not None,

                "object_lock_enabled":
                    bool(object_lock),

                "replication_enabled":
                    replication is not None,

                "static_website_enabled":
                    website_config is not None
            },

            "tags":
                tags,

            "security": {

                "status":
                    "PASS"
                    if not findings
                    else "FAIL",

                "findings":
                    findings
            }
        }

        results.append(resource)

    logger.info(
        f"S3 → {len(results)} buckets"
    )

    return results