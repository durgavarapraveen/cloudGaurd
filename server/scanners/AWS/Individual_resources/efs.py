import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_efs(session, region):

    # logger.info(f"Scanning EFS in {region}")

    client = session.client(
        "efs",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # EFS FILE SYSTEMS
    # ─────────────────────────────

    file_systems = paginate(
        client,
        "describe_file_systems",
        "FileSystems"
    )

    for fs in file_systems:

        fs_id = fs.get("FileSystemId")

        # ─────────────────────────
        # Mount Targets
        # ─────────────────────────

        mount_targets = paginate(
            client,
            "describe_mount_targets",
            "MountTargets",
            FileSystemId=fs_id
        )

        mount_target_details = []

        for mt in mount_targets:

            security_groups_resp = safe_call(
                client.describe_mount_target_security_groups,
                MountTargetId=mt.get("MountTargetId")
            )

            mount_target_details.append({

                "mount_target_id":
                    mt.get("MountTargetId"),

                "availability_zone_id":
                    mt.get("AvailabilityZoneId"),

                "availability_zone_name":
                    mt.get("AvailabilityZoneName"),

                "subnet_id":
                    mt.get("SubnetId"),

                "vpc_id":
                    mt.get("VpcId"),

                "owner_id":
                    mt.get("OwnerId"),

                "ip_address":
                    mt.get("IpAddress"),

                "network_interface_id":
                    mt.get("NetworkInterfaceId"),

                "life_cycle_state":
                    mt.get("LifeCycleState"),

                "security_groups":
                    security_groups_resp.get(
                        "SecurityGroups",
                        []
                    )
                    if security_groups_resp else []
            })

        # ─────────────────────────
        # Access Points
        # ─────────────────────────

        access_points = paginate(
            client,
            "describe_access_points",
            "AccessPoints",
            FileSystemId=fs_id
        )

        access_point_details = []

        for ap in access_points:

            access_point_details.append({

                "access_point_id":
                    ap.get("AccessPointId"),

                "arn":
                    ap.get("AccessPointArn"),

                "life_cycle_state":
                    ap.get("LifeCycleState"),

                "root_directory":
                    ap.get("RootDirectory"),

                "posix_user":
                    ap.get("PosixUser"),

                "owner_id":
                    ap.get("OwnerId"),

                "client_token":
                    ap.get("ClientToken"),

                "tags":
                    ap.get("Tags", [])
            })

        # ─────────────────────────
        # Policies
        # ─────────────────────────

        policy_resp = safe_call(
            client.describe_file_system_policy,
            FileSystemId=fs_id
        )

        backup_resp = safe_call(
            client.describe_backup_policy,
            FileSystemId=fs_id
        )

        lifecycle_resp = safe_call(
            client.describe_lifecycle_configuration,
            FileSystemId=fs_id
        )

        replication_resp = safe_call(
            client.describe_replication_configurations,
            FileSystemId=fs_id
        )

        tags_resp = safe_call(
            client.describe_tags,
            FileSystemId=fs_id
        )

        resource = {

            "service": "efs",

            "resource_type":
                "efs_filesystem",

            "resource_id":
                fs_id,

            "resource_name":
                next(

                    (
                        t["Value"]
                        for t in fs.get("Tags", [])
                        if t["Key"] == "Name"
                    ),

                    fs_id
                ),

            "arn":
                fs.get("FileSystemArn"),

            "region":
                region,

            "configuration": {

                # Basic Info
                "owner_id":
                    fs.get("OwnerId"),

                "creation_token":
                    fs.get("CreationToken"),

                "life_cycle_state":
                    fs.get("LifeCycleState"),

                "availability_zone_name":
                    fs.get("AvailabilityZoneName"),

                "availability_zone_id":
                    fs.get("AvailabilityZoneId"),

                # Size / Usage
                "size_in_bytes":
                    fs.get(
                        "SizeInBytes",
                        {}
                    ),

                "size_bytes":
                    fs.get(
                        "SizeInBytes",
                        {}
                    ).get("Value"),

                # Performance
                "performance_mode":
                    fs.get("PerformanceMode"),

                "throughput_mode":
                    fs.get("ThroughputMode"),

                "provisioned_throughput_in_mibps":
                    fs.get(
                        "ProvisionedThroughputInMibps"
                    ),

                # Encryption
                "encrypted":
                    fs.get("Encrypted", False),

                "kms_key_id":
                    fs.get("KmsKeyId"),

                # Mount Targets
                "number_of_mount_targets":
                    fs.get("NumberOfMountTargets"),

                "mount_targets":
                    mount_target_details,

                "mount_target_count":
                    len(mount_target_details),

                # Access Points
                "access_points":
                    access_point_details,

                "access_point_count":
                    len(access_point_details),

                # File System Policy
                "file_system_policy":
                    policy_resp.get("Policy")
                    if policy_resp else None,

                # Backup
                "backup_policy":
                    backup_resp.get(
                        "BackupPolicy",
                        {}
                    ).get("Status")
                    if backup_resp else None,

                # Lifecycle Policies
                "lifecycle_policies":
                    lifecycle_resp.get(
                        "LifecyclePolicies",
                        []
                    )
                    if lifecycle_resp else [],

                # Replication
                "replication_configurations":
                    replication_resp.get(
                        "Replications",
                        []
                    )
                    if replication_resp else [],

                # Creation Time
                "creation_time":
                    fs.get("CreationTime").isoformat()
                    if fs.get("CreationTime") else None,

                # Number of Clients
                "number_of_clients":
                    fs.get("NumberOfClients"),

                # Derived Security Flags
                "is_encrypted":
                    fs.get("Encrypted", False),

                "backup_enabled":
                    (
                        backup_resp and
                        backup_resp.get(
                            "BackupPolicy",
                            {}
                        ).get("Status") == "ENABLED"
                    ),

                "has_file_system_policy":
                    policy_resp is not None,

                "is_available":
                    fs.get("LifeCycleState")
                    == "available",

                "has_mount_targets":
                    len(mount_target_details) > 0,

                "has_access_points":
                    len(access_point_details) > 0
            },

            "tags":
                tags_resp.get("Tags", [])
                if tags_resp else fs.get("Tags", [])
        }

        results.append(resource)

    logger.info(f"EFS {region} → {len(results)} resources")

    return results