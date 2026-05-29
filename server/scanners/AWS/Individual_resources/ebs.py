import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_ebs(session, region):

    # logger.info(f"Scanning EBS in {region}")

    client = session.client(
        "ec2",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # ACCOUNT LEVEL EBS SETTINGS
    # ─────────────────────────────

    encryption_resp = safe_call(
        client.get_ebs_encryption_by_default
    )

    default_kms_resp = safe_call(
        client.get_ebs_default_kms_key_id
    )

    resource = {

        "service": "ebs",

        "resource_type":
            "ebs_account_settings",

        "resource_id":
            f"ebs-account-settings-{region}",

        "resource_name":
            f"EBS Account Settings ({region})",

        "arn":
            None,

        "region":
            region,

        "configuration": {

            # Default Encryption
            "ebs_encryption_by_default":
                encryption_resp.get(
                    "EbsEncryptionByDefault",
                    False
                )
                if encryption_resp else False,

            "default_kms_key_id":
                default_kms_resp.get(
                    "KmsKeyId"
                )
                if default_kms_resp else None,

            # Derived Security Flags
            "default_encryption_enabled":
                encryption_resp.get(
                    "EbsEncryptionByDefault",
                    False
                )
                if encryption_resp else False,

            "uses_customer_managed_kms":
                (
                    default_kms_resp.get(
                        "KmsKeyId"
                    )
                    not in [None, "alias/aws/ebs"]
                )
                if default_kms_resp else False
        },

        "tags":
            []
    }

    results.append(resource)

    # ─────────────────────────────
    # SNAPSHOTS
    # ─────────────────────────────

    snapshots = paginate(
        client,
        "describe_snapshots",
        "Snapshots",
        OwnerIds=["self"]
    )

    for snapshot in snapshots:

        snapshot_id = snapshot.get(
            "SnapshotId"
        )

        create_volume_permissions_resp = safe_call(

            client.describe_snapshot_attribute,

            SnapshotId=snapshot_id,

            Attribute="createVolumePermission"
        )

        create_volume_permissions = []

        if create_volume_permissions_resp:

            create_volume_permissions = (
                create_volume_permissions_resp.get(
                    "CreateVolumePermissions",
                    []
                )
            )

        public_snapshot = any(

            perm.get("Group") == "all"

            for perm in create_volume_permissions
        )

        storage_tier = snapshot.get(
            "StorageTier"
        )

        restore_expiry_time = snapshot.get(
            "RestoreExpiryTime"
        )

        resource = {

            "service": "ebs",

            "resource_type":
                "ebs_snapshot",

            "resource_id":
                snapshot_id,

            "resource_name":
                next(

                    (
                        t["Value"]
                        for t in snapshot.get("Tags", [])
                        if t["Key"] == "Name"
                    ),

                    snapshot_id
                ),

            "arn":
                f"arn:aws:ec2:{region}::snapshot/{snapshot_id}",

            "region":
                region,

            "configuration": {

                # Basic Info
                "description":
                    snapshot.get("Description"),

                "state":
                    snapshot.get("State"),

                "owner_id":
                    snapshot.get("OwnerId"),

                "owner_alias":
                    snapshot.get("OwnerAlias"),

                # Source Volume
                "volume_id":
                    snapshot.get("VolumeId"),

                "volume_size_gb":
                    snapshot.get("VolumeSize"),

                # Encryption
                "encrypted":
                    snapshot.get(
                        "Encrypted",
                        False
                    ),

                "kms_key_id":
                    snapshot.get("KmsKeyId"),

                "data_encryption_key_id":
                    snapshot.get(
                        "DataEncryptionKeyId"
                    ),

                # Progress
                "progress":
                    snapshot.get("Progress"),

                # Storage Tier
                "storage_tier":
                    storage_tier,

                "is_archive_tier":
                    storage_tier == "archive",

                "restore_expiry_time":
                    restore_expiry_time.isoformat()
                    if restore_expiry_time else None,

                # Time
                "start_time":
                    snapshot.get(
                        "StartTime"
                    ).isoformat()
                    if snapshot.get(
                        "StartTime"
                    ) else None,

                "completion_time":
                    snapshot.get(
                        "CompletionTime"
                    ).isoformat()
                    if snapshot.get(
                        "CompletionTime"
                    ) else None,

                # Permissions
                "create_volume_permissions":
                    create_volume_permissions,

                "public":
                    public_snapshot,

                "shared_accounts":
                    [

                        perm.get("UserId")

                        for perm in create_volume_permissions

                        if perm.get("UserId")
                    ],

                # Outpost
                "outpost_arn":
                    snapshot.get("OutpostArn"),

                # Transfer
                "transfer_type":
                    snapshot.get("TransferType"),

                # S3 Import
                "sse_type":
                    snapshot.get("SseType"),

                # Derived Security Flags
                "is_public":
                    public_snapshot,

                "is_encrypted":
                    snapshot.get(
                        "Encrypted",
                        False
                    ),

                "uses_customer_managed_kms":
                    (
                        snapshot.get("KmsKeyId")
                        not in [None, "alias/aws/ebs"]
                    ),

                "is_completed":
                    snapshot.get("State")
                    == "completed",

                "is_recoverable":
                    snapshot.get("State")
                    in [
                        "completed",
                        "recoverable"
                    ],

                "shared_externally":
                    len(
                        [
                            perm
                            for perm in create_volume_permissions
                            if perm.get("UserId")
                        ]
                    ) > 0
            },

            "tags":
                snapshot.get("Tags", [])
        }

        results.append(resource)

    # ─────────────────────────────
    # FAST SNAPSHOT RESTORES
    # ─────────────────────────────

    fast_snapshot_restores = paginate(
        client,
        "describe_fast_snapshot_restores",
        "FastSnapshotRestores"
    )

    for fsr in fast_snapshot_restores:

        snapshot_id = fsr.get(
            "SnapshotId"
        )

        resource = {

            "service": "ebs",

            "resource_type":
                "ebs_fast_snapshot_restore",

            "resource_id":
                f"{snapshot_id}-{fsr.get('AvailabilityZone')}",

            "resource_name":
                snapshot_id,

            "arn":
                None,

            "region":
                region,

            "configuration": {

                "snapshot_id":
                    snapshot_id,

                "availability_zone":
                    fsr.get(
                        "AvailabilityZone"
                    ),

                "state":
                    fsr.get("State"),

                "state_transition_reason":
                    fsr.get(
                        "StateTransitionReason"
                    ),

                "owner_id":
                    fsr.get("OwnerId"),

                "enabled_time":
                    fsr.get(
                        "EnabledTime"
                    ).isoformat()
                    if fsr.get(
                        "EnabledTime"
                    ) else None,

                "optimizing_time":
                    fsr.get(
                        "OptimizingTime"
                    ).isoformat()
                    if fsr.get(
                        "OptimizingTime"
                    ) else None,

                "enabling_time":
                    fsr.get(
                        "EnablingTime"
                    ).isoformat()
                    if fsr.get(
                        "EnablingTime"
                    ) else None,

                "disabling_time":
                    fsr.get(
                        "DisablingTime"
                    ).isoformat()
                    if fsr.get(
                        "DisablingTime"
                    ) else None,

                # Derived Flags
                "is_enabled":
                    fsr.get("State")
                    == "enabled",

                "is_optimizing":
                    fsr.get("State")
                    == "optimizing"
            },

            "tags":
                []
        }

        results.append(resource)

    logger.info(f"EBS {region} → {len(results)} resources")

    return results