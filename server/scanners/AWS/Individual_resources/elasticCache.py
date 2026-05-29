import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_elasticache(session, region):

    # logger.info(f"Scanning ElastiCache in {region}")

    client = session.client(
        "elasticache",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # REPLICATION GROUPS (REDIS)
    # ─────────────────────────────

    replication_groups = paginate(
        client,
        "describe_replication_groups",
        "ReplicationGroups"
    )

    for rg in replication_groups:

        replication_group_id = rg.get(
            "ReplicationGroupId"
        )

        subnet_group_name = rg.get(
            "CacheSubnetGroupName"
        )

        subnet_group_resp = None

        if subnet_group_name:

            subnet_group_resp = safe_call(
                client.describe_cache_subnet_groups,
                CacheSubnetGroupName=subnet_group_name
            )

        subnet_group = None

        if (
            subnet_group_resp and
            subnet_group_resp.get(
                "CacheSubnetGroups"
            )
        ):

            subnet_group = subnet_group_resp.get(
                "CacheSubnetGroups",
                []
            )[0]

        node_groups = []

        for ng in rg.get(
            "NodeGroups",
            []
        ):

            node_group_members = []

            for member in ng.get(
                "NodeGroupMembers",
                []
            ):

                node_group_members.append({

                    "cache_cluster_id":
                        member.get(
                            "CacheClusterId"
                        ),

                    "cache_node_id":
                        member.get(
                            "CacheNodeId"
                        ),

                    "preferred_availability_zone":
                        member.get(
                            "PreferredAvailabilityZone"
                        ),

                    "current_role":
                        member.get(
                            "CurrentRole"
                        ),

                    "read_endpoint":
                        member.get(
                            "ReadEndpoint"
                        )
                })

            node_groups.append({

                "node_group_id":
                    ng.get("NodeGroupId"),

                "status":
                    ng.get("Status"),

                "primary_endpoint":
                    ng.get(
                        "PrimaryEndpoint"
                    ),

                "reader_endpoint":
                    ng.get(
                        "ReaderEndpoint"
                    ),

                "slots":
                    ng.get("Slots"),

                "member_count":
                    len(node_group_members),

                "members":
                    node_group_members
            })

        log_delivery_configs = []

        for log_cfg in rg.get(
            "LogDeliveryConfigurations",
            []
        ):

            log_delivery_configs.append({

                "log_type":
                    log_cfg.get("LogType"),

                "destination_type":
                    log_cfg.get(
                        "DestinationType"
                    ),

                "destination_details":
                    log_cfg.get(
                        "DestinationDetails"
                    ),

                "log_format":
                    log_cfg.get("LogFormat"),

                "status":
                    log_cfg.get("Status")
            })

        resource = {

            "service": "elasticache",

            "resource_type":
                "elasticache_replication_group",

            "resource_id":
                replication_group_id,

            "resource_name":
                rg.get("Description")
                or replication_group_id,

            "arn":
                rg.get("ARN"),

            "region":
                region,

            "configuration": {

                # Basic Info
                "description":
                    rg.get("Description"),

                "status":
                    rg.get("Status"),

                "engine":
                    "redis",

                "engine_version":
                    rg.get("EngineVersion"),

                "cache_node_type":
                    rg.get("CacheNodeType"),

                # HA / Availability
                "multi_az":
                    rg.get("MultiAZ"),

                "automatic_failover":
                    rg.get(
                        "AutomaticFailover"
                    ),

                "cluster_mode":
                    rg.get("ClusterEnabled"),

                "global_replication_group":
                    rg.get(
                        "GlobalReplicationGroupInfo",
                        {}
                    ),

                # Encryption / Security
                "at_rest_encryption":
                    rg.get(
                        "AtRestEncryptionEnabled",
                        False
                    ),

                "in_transit_encryption":
                    rg.get(
                        "TransitEncryptionEnabled",
                        False
                    ),

                "auth_token_enabled":
                    rg.get(
                        "AuthTokenEnabled",
                        False
                    ),

                "kms_key_id":
                    rg.get("KmsKeyId"),

                "user_group_ids":
                    rg.get(
                        "UserGroupIds",
                        []
                    ),

                # Snapshot / Backup
                "snapshotting_cluster":
                    rg.get(
                        "SnapshottingClusterId"
                    ),

                "snapshot_retention_limit":
                    rg.get(
                        "SnapshotRetentionLimit"
                    ),

                "snapshot_window":
                    rg.get("SnapshotWindow"),

                # Maintenance
                "preferred_maintenance_window":
                    rg.get(
                        "PreferredMaintenanceWindow"
                    ),

                "auto_minor_version_upgrade":
                    rg.get(
                        "AutoMinorVersionUpgrade"
                    ),

                # Network
                "cache_subnet_group_name":
                    subnet_group_name,

                "subnet_group":
                    subnet_group,

                "security_groups":
                    rg.get(
                        "MemberClusters",
                        []
                    ),

                # Endpoints
                "configuration_endpoint":
                    rg.get(
                        "ConfigurationEndpoint"
                    ),

                "reader_endpoint":
                    rg.get("ReaderEndpoint"),

                # Node Groups
                "node_group_count":
                    len(node_groups),

                "node_groups":
                    node_groups,

                # Logging
                "log_delivery_configurations":
                    log_delivery_configs,

                # Derived Security Flags
                "is_encrypted_at_rest":
                    rg.get(
                        "AtRestEncryptionEnabled",
                        False
                    ),

                "is_encrypted_in_transit":
                    rg.get(
                        "TransitEncryptionEnabled",
                        False
                    ),

                "has_auth_token":
                    rg.get(
                        "AuthTokenEnabled",
                        False
                    ),

                "is_multi_az":
                    rg.get("MultiAZ") is True,

                "automatic_failover_enabled":
                    rg.get(
                        "AutomaticFailover"
                    ) == "enabled",

                "cluster_mode_enabled":
                    rg.get(
                        "ClusterEnabled",
                        False
                    )
            },

            "tags":
                rg.get("Tags", [])
        }

        results.append(resource)

    # ─────────────────────────────
    # CACHE CLUSTERS
    # ─────────────────────────────

    clusters = paginate(
        client,
        "describe_cache_clusters",
        "CacheClusters",
        ShowCacheNodeInfo=True
    )

    for cluster in clusters:

        # Skip clusters already part of replication groups
        if cluster.get("ReplicationGroupId"):
            continue

        cluster_id = cluster.get(
            "CacheClusterId"
        )

        security_groups = []

        for sg in cluster.get(
            "SecurityGroups",
            []
        ):

            security_groups.append({

                "security_group_id":
                    sg.get(
                        "SecurityGroupId"
                    ),

                "status":
                    sg.get("Status")
            })

        cache_nodes = []

        for node in cluster.get(
            "CacheNodes",
            []
        ):

            cache_nodes.append({

                "cache_node_id":
                    node.get("CacheNodeId"),

                "cache_node_status":
                    node.get(
                        "CacheNodeStatus"
                    ),

                "availability_zone":
                    node.get(
                        "CustomerAvailabilityZone"
                    ),

                "endpoint":
                    node.get("Endpoint")
            })

        notification_config = cluster.get(
            "NotificationConfiguration",
            {}
        )

        resource = {

            "service": "elasticache",

            "resource_type":
                "elasticache_cluster",

            "resource_id":
                cluster_id,

            "resource_name":
                cluster_id,

            "arn":
                cluster.get("ARN"),

            "region":
                region,

            "configuration": {

                # Basic Info
                "status":
                    cluster.get(
                        "CacheClusterStatus"
                    ),

                "engine":
                    cluster.get("Engine"),

                "engine_version":
                    cluster.get(
                        "EngineVersion"
                    ),

                "node_type":
                    cluster.get(
                        "CacheNodeType"
                    ),

                # Nodes
                "num_cache_nodes":
                    cluster.get(
                        "NumCacheNodes"
                    ),

                "cache_nodes":
                    cache_nodes,

                # Security
                "at_rest_encryption":
                    cluster.get(
                        "AtRestEncryptionEnabled",
                        False
                    ),

                "in_transit_encryption":
                    cluster.get(
                        "TransitEncryptionEnabled",
                        False
                    ),

                "auth_token_enabled":
                    cluster.get(
                        "AuthTokenEnabled",
                        False
                    ),

                "kms_key_id":
                    cluster.get("KmsKeyId"),

                # Availability
                "preferred_availability_zone":
                    cluster.get(
                        "PreferredAvailabilityZone"
                    ),

                "preferred_outpost_arn":
                    cluster.get(
                        "PreferredOutpostArn"
                    ),

                # Upgrades
                "auto_minor_upgrade":
                    cluster.get(
                        "AutoMinorVersionUpgrade"
                    ),

                "preferred_maintenance_window":
                    cluster.get(
                        "PreferredMaintenanceWindow"
                    ),

                # Network
                "subnet_group":
                    cluster.get(
                        "CacheSubnetGroupName"
                    ),

                "security_groups":
                    security_groups,

                # Notifications
                "notification_configuration":
                    notification_config,

                # Parameter Group
                "cache_parameter_group":
                    cluster.get(
                        "CacheParameterGroup",
                        {}
                    ),

                # Snapshot
                "snapshot_retention_limit":
                    cluster.get(
                        "SnapshotRetentionLimit"
                    ),

                "snapshot_window":
                    cluster.get("SnapshotWindow"),

                # Dates
                "cache_cluster_create_time":
                    cluster.get(
                        "CacheClusterCreateTime"
                    ).isoformat()
                    if cluster.get(
                        "CacheClusterCreateTime"
                    ) else None,

                # Derived Security Flags
                "is_encrypted_at_rest":
                    cluster.get(
                        "AtRestEncryptionEnabled",
                        False
                    ),

                "is_encrypted_in_transit":
                    cluster.get(
                        "TransitEncryptionEnabled",
                        False
                    ),

                "is_multi_az":
                    cluster.get(
                        "PreferredAvailabilityZone"
                    ) == "Multiple",

                "auto_minor_version_upgrade":
                    cluster.get(
                        "AutoMinorVersionUpgrade",
                        False
                    ),

                "has_security_groups":
                    len(security_groups) > 0
            },

            "tags":
                cluster.get("Tags", [])
        }

        results.append(resource)

    logger.info(f"ElastiCache {region} → {len(results)} resources")

    return results