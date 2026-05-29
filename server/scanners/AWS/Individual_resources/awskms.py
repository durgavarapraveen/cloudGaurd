import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_kms(session, region):

    # logger.info(f"Scanning KMS in {region}")

    client = session.client(
        "kms",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # KMS KEYS
    # ─────────────────────────────

    keys = paginate(
        client,
        "list_keys",
        "Keys"
    )

    for key in keys:

        key_id = key.get("KeyId")

        meta_resp = safe_call(
            client.describe_key,
            KeyId=key_id
        )

        if not meta_resp:
            continue

        meta = meta_resp.get(
            "KeyMetadata",
            {}
        )

        # Skip AWS managed keys
        if meta.get("KeyManager") == "AWS":
            continue

        policy_resp = safe_call(
            client.get_key_policy,
            KeyId=key_id,
            PolicyName="default"
        )

        rotation_resp = safe_call(
            client.get_key_rotation_status,
            KeyId=key_id
        )

        tags_resp = safe_call(
            client.list_resource_tags,
            KeyId=key_id
        )

        aliases_resp = safe_call(
            client.list_aliases,
            KeyId=key_id
        )

        grants_resp = safe_call(
            client.list_grants,
            KeyId=key_id
        )

        rotation_period_resp = safe_call(
            client.get_key_rotation_status,
            KeyId=key_id
        )

        aliases = []

        if aliases_resp:
            aliases = [
                alias.get("AliasName")
                for alias in aliases_resp.get("Aliases", [])
                if alias.get("AliasName")
            ]

        grants = []

        if grants_resp:

            for grant in grants_resp.get(
                "Grants",
                []
            ):

                grants.append({

                    "grant_id":
                        grant.get("GrantId"),

                    "grantee_principal":
                        grant.get("GranteePrincipal"),

                    "issuing_account":
                        grant.get("IssuingAccount"),

                    "operations":
                        grant.get("Operations", []),

                    "creation_date":
                        grant.get("CreationDate").isoformat()
                        if grant.get("CreationDate") else None,

                    "name":
                        grant.get("Name"),

                    "retiring_principal":
                        grant.get("RetiringPrincipal")
                })

        resource = {

            "service": "kms",

            "resource_type":
                "kms_key",

            "resource_id":
                meta.get("KeyId"),

            "resource_name":
                meta.get("Description")
                or (
                    aliases[0]
                    if aliases else meta.get("KeyId")
                ),

            "arn":
                meta.get("Arn"),

            "region":
                region,

            "configuration": {

                # Basic Metadata
                "description":
                    meta.get("Description"),

                "aws_account_id":
                    meta.get("AWSAccountId"),

                "key_state":
                    meta.get("KeyState"),

                "enabled":
                    meta.get("Enabled"),

                "key_usage":
                    meta.get("KeyUsage"),

                "key_spec":
                    meta.get("KeySpec"),

                "customer_master_key_spec":
                    meta.get("CustomerMasterKeySpec"),

                "encryption_algorithms":
                    meta.get("EncryptionAlgorithms", []),

                "signing_algorithms":
                    meta.get("SigningAlgorithms", []),

                "key_manager":
                    meta.get("KeyManager"),

                "origin":
                    meta.get("Origin"),

                "multi_region":
                    meta.get("MultiRegion", False),

                "multi_region_configuration":
                    meta.get("MultiRegionConfiguration", {}),

                # Dates
                "creation_date":
                    meta.get("CreationDate").isoformat()
                    if meta.get("CreationDate") else None,

                "deletion_date":
                    meta.get("DeletionDate").isoformat()
                    if meta.get("DeletionDate") else None,

                "valid_to":
                    meta.get("ValidTo").isoformat()
                    if meta.get("ValidTo") else None,

                # Rotation
                "rotation_enabled":
                    rotation_resp.get("KeyRotationEnabled")
                    if rotation_resp else None,

                "rotation_period_in_days":
                    rotation_period_resp.get("RotationPeriodInDays")
                    if rotation_period_resp else None,

                # External / Imported Material
                "expiration_model":
                    meta.get("ExpirationModel"),

                "pending_deletion_window_in_days":
                    meta.get("PendingDeletionWindowInDays"),

                # Custom Key Store
                "custom_key_store_id":
                    meta.get("CustomKeyStoreId"),

                "cloud_hsm_cluster_id":
                    meta.get("CloudHsmClusterId"),

                # XKS
                "xks_key_configuration":
                    meta.get("XksKeyConfiguration"),

                # Usage
                "mac_algorithms":
                    meta.get("MacAlgorithms", []),

                # Policy
                "key_policy":
                    policy_resp.get("Policy")
                    if policy_resp else None,

                # Aliases
                "aliases":
                    aliases,

                "alias_count":
                    len(aliases),

                # Grants
                "grants":
                    grants,

                "grant_count":
                    len(grants),

                # Derived Security Flags
                "is_enabled":
                    meta.get("Enabled") is True,

                "is_symmetric":
                    meta.get("KeySpec") == "SYMMETRIC_DEFAULT",

                "is_asymmetric":
                    meta.get("KeySpec") != "SYMMETRIC_DEFAULT",

                "is_multi_region":
                    meta.get("MultiRegion", False),

                "is_external":
                    meta.get("Origin") == "EXTERNAL",

                "is_cloudhsm":
                    meta.get("Origin") == "AWS_CLOUDHSM",

                "is_pending_deletion":
                    meta.get("KeyState") == "PendingDeletion",

                "is_customer_managed":
                    meta.get("KeyManager") == "CUSTOMER"
            },

            "tags":
                tags_resp.get("Tags", [])
                if tags_resp else []
        }

        results.append(resource)

    logger.info(f"KMS {region} → {len(results)} resources")

    return results