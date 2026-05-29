import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_rds(session, region):

    logger.info(f"Scanning RDS in {region}")

    client = session.client(
        "rds",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # DB INSTANCES
    # ─────────────────────────────

    instances = paginate(
        client,
        "describe_db_instances",
        "DBInstances"
    )

    for db in instances:

        findings = []

        db_arn = db.get(
            "DBInstanceArn"
        )

        db_identifier = db.get(
            "DBInstanceIdentifier"
        )

        # ─────────────────────────────
        # TAGS
        # ─────────────────────────────

        tags_resp = safe_call(
            client.list_tags_for_resource,
            ResourceName=db_arn
        )

        tags = (
            tags_resp.get(
                "TagList",
                []
            )
            if tags_resp else []
        )

        # ─────────────────────────────
        # SECURITY CHECKS
        # ─────────────────────────────

        if db.get("PubliclyAccessible"):

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "RDS instance is publicly accessible"
            })

        if not db.get("StorageEncrypted"):

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Storage encryption disabled"
            })

        if not db.get("DeletionProtection"):

            findings.append({

                "severity":
                    "MEDIUM",

                "issue":
                    "Deletion protection disabled"
            })

        if db.get(
            "BackupRetentionPeriod",
            0
        ) == 0:

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Automated backups disabled"
            })

        if not db.get(
            "IAMDatabaseAuthenticationEnabled"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "IAM DB authentication disabled"
            })

        if not db.get(
            "PerformanceInsightsEnabled"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "Performance Insights disabled"
            })

        if not db.get(
            "EnabledCloudwatchLogsExports"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "CloudWatch log exports disabled"
            })

        # ─────────────────────────────
        # ENHANCED MONITORING
        # ─────────────────────────────

        monitoring_role_arn = db.get(
            "MonitoringRoleArn"
        )

        monitoring_interval = db.get(
            "MonitoringInterval"
        )

        # ─────────────────────────────
        # PENDING MODIFICATIONS
        # ─────────────────────────────

        pending_modifications = db.get(
            "PendingModifiedValues",
            {}
        )

        # ─────────────────────────────
        # SUBNETS
        # ─────────────────────────────

        subnet_group = db.get(
            "DBSubnetGroup",
            {}
        )

        subnets = []

        for subnet in subnet_group.get(
            "Subnets",
            []
        ):

            subnets.append({

                "subnet_identifier":
                    subnet.get(
                        "SubnetIdentifier"
                    ),

                "subnet_status":
                    subnet.get(
                        "SubnetStatus"
                    ),

                "availability_zone":
                    subnet.get(
                        "SubnetAvailabilityZone",
                        {}
                    ).get("Name")
            })

        # ─────────────────────────────
        # ENDPOINT
        # ─────────────────────────────

        endpoint = db.get(
            "Endpoint",
            {}
        )

        # ─────────────────────────────
        # READ REPLICAS
        # ─────────────────────────────

        read_replicas = db.get(
            "ReadReplicaDBInstanceIdentifiers",
            []
        )

        # ─────────────────────────────
        # RESOURCE
        # ─────────────────────────────

        resource = {

            "service": "rds",

            "resource_type":
                "rds_instance",

            "resource_id":
                db_identifier,

            "resource_name":
                db_identifier,

            "arn":
                db_arn,

            "region":
                region,

            "configuration": {

                # Engine
                "engine":
                    db.get("Engine"),

                "engine_version":
                    db.get(
                        "EngineVersion"
                    ),

                "license_model":
                    db.get(
                        "LicenseModel"
                    ),

                "character_set_name":
                    db.get(
                        "CharacterSetName"
                    ),

                # Compute
                "instance_class":
                    db.get(
                        "DBInstanceClass"
                    ),

                "processor_features":
                    db.get(
                        "ProcessorFeatures",
                        []
                    ),

                # State
                "status":
                    db.get(
                        "DBInstanceStatus"
                    ),

                "automatic_restart_time":
                    db.get(
                        "AutomaticRestartTime"
                    ).isoformat()
                    if db.get(
                        "AutomaticRestartTime"
                    ) else None,

                # Storage
                "allocated_storage":
                    db.get(
                        "AllocatedStorage"
                    ),

                "max_allocated_storage":
                    db.get(
                        "MaxAllocatedStorage"
                    ),

                "storage_type":
                    db.get(
                        "StorageType"
                    ),

                "storage_throughput":
                    db.get(
                        "StorageThroughput"
                    ),

                "iops":
                    db.get("Iops"),

                "storage_encrypted":
                    db.get(
                        "StorageEncrypted"
                    ),

                "kms_key_id":
                    db.get("KmsKeyId"),

                # Availability
                "multi_az":
                    db.get("MultiAZ"),

                "availability_zone":
                    db.get(
                        "AvailabilityZone"
                    ),

                "secondary_availability_zone":
                    db.get(
                        "SecondaryAvailabilityZone"
                    ),

                # Network
                "publicly_accessible":
                    db.get(
                        "PubliclyAccessible"
                    ),

                "endpoint":
                    endpoint.get(
                        "Address"
                    ),

                "port":
                    endpoint.get("Port"),

                "hosted_zone_id":
                    endpoint.get(
                        "HostedZoneId"
                    ),

                "network_type":
                    db.get(
                        "NetworkType"
                    ),

                "db_subnet_group":
                    subnet_group.get(
                        "DBSubnetGroupName"
                    ),

                "vpc_id":
                    subnet_group.get(
                        "VpcId"
                    ),

                "subnets":
                    subnets,

                "vpc_security_groups":
                    db.get(
                        "VpcSecurityGroups",
                        []
                    ),

                # Security
                "deletion_protection":
                    db.get(
                        "DeletionProtection"
                    ),

                "iam_database_authentication":
                    db.get(
                        "IAMDatabaseAuthenticationEnabled"
                    ),

                "ca_certificate_identifier":
                    db.get(
                        "CACertificateIdentifier"
                    ),

                "domain_memberships":
                    db.get(
                        "DomainMemberships",
                        []
                    ),

                # Backups
                "backup_retention_period":
                    db.get(
                        "BackupRetentionPeriod"
                    ),

                "preferred_backup_window":
                    db.get(
                        "PreferredBackupWindow"
                    ),

                "backup_target":
                    db.get(
                        "BackupTarget"
                    ),

                "copy_tags_to_snapshot":
                    db.get(
                        "CopyTagsToSnapshot"
                    ),

                # Maintenance
                "preferred_maintenance_window":
                    db.get(
                        "PreferredMaintenanceWindow"
                    ),

                "auto_minor_version_upgrade":
                    db.get(
                        "AutoMinorVersionUpgrade"
                    ),

                "pending_modified_values":
                    pending_modifications,

                # Monitoring
                "performance_insights_enabled":
                    db.get(
                        "PerformanceInsightsEnabled"
                    ),

                "performance_insights_kms_key_id":
                    db.get(
                        "PerformanceInsightsKMSKeyId"
                    ),

                "performance_insights_retention_period":
                    db.get(
                        "PerformanceInsightsRetentionPeriod"
                    ),

                "enhanced_monitoring_interval":
                    monitoring_interval,

                "monitoring_role_arn":
                    monitoring_role_arn,

                "enabled_cloudwatch_logs_exports":
                    db.get(
                        "EnabledCloudwatchLogsExports",
                        []
                    ),

                # Replication
                "read_replica_source":
                    db.get(
                        "ReadReplicaSourceDBInstanceIdentifier"
                    ),

                "read_replica_identifiers":
                    read_replicas,

                "replica_mode":
                    db.get("ReplicaMode"),

                # Parameter Groups
                "db_parameter_groups":
                    db.get(
                        "DBParameterGroups",
                        []
                    ),

                "option_group_memberships":
                    db.get(
                        "OptionGroupMemberships",
                        []
                    ),

                # IAM Roles
                "associated_roles":
                    db.get(
                        "AssociatedRoles",
                        []
                    ),

                # Activity Streams
                "activity_stream_status":
                    db.get(
                        "ActivityStreamStatus"
                    ),

                "activity_stream_kms_key_id":
                    db.get(
                        "ActivityStreamKmsKeyId"
                    ),

                # Time
                "instance_create_time":
                    db.get(
                        "InstanceCreateTime"
                    ).isoformat()
                    if db.get(
                        "InstanceCreateTime"
                    ) else None,

                "latest_restorable_time":
                    db.get(
                        "LatestRestorableTime"
                    ).isoformat()
                    if db.get(
                        "LatestRestorableTime"
                    ) else None,

                # Misc
                "db_name":
                    db.get("DBName"),

                "master_username":
                    db.get(
                        "MasterUsername"
                    ),

                "timezone":
                    db.get("Timezone"),

                "dedicated_log_volume":
                    db.get(
                        "DedicatedLogVolume"
                    ),

                "customer_owned_ip_enabled":
                    db.get(
                        "CustomerOwnedIpEnabled"
                    ),

                # Derived
                "is_encrypted":
                    db.get(
                        "StorageEncrypted"
                    ),

                "is_public":
                    db.get(
                        "PubliclyAccessible"
                    ),

                "has_read_replicas":
                    len(read_replicas) > 0
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

    # ─────────────────────────────
    # DB CLUSTERS (Aurora)
    # ─────────────────────────────

    clusters = paginate(
        client,
        "describe_db_clusters",
        "DBClusters"
    )

    for cluster in clusters:

        findings = []

        cluster_arn = cluster.get(
            "DBClusterArn"
        )

        cluster_id = cluster.get(
            "DBClusterIdentifier"
        )

        # ─────────────────────────────
        # TAGS
        # ─────────────────────────────

        tags_resp = safe_call(
            client.list_tags_for_resource,
            ResourceName=cluster_arn
        )

        tags = (
            tags_resp.get(
                "TagList",
                []
            )
            if tags_resp else []
        )

        # ─────────────────────────────
        # SECURITY CHECKS
        # ─────────────────────────────

        if not cluster.get(
            "StorageEncrypted"
        ):

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Cluster encryption disabled"
            })

        if not cluster.get(
            "DeletionProtection"
        ):

            findings.append({

                "severity":
                    "MEDIUM",

                "issue":
                    "Deletion protection disabled"
            })

        if cluster.get(
            "BackupRetentionPeriod",
            0
        ) == 0:

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Cluster backups disabled"
            })

        # ─────────────────────────────
        # RESOURCE
        # ─────────────────────────────

        resource = {

            "service": "rds",

            "resource_type":
                "rds_cluster",

            "resource_id":
                cluster_id,

            "resource_name":
                cluster_id,

            "arn":
                cluster_arn,

            "region":
                region,

            "configuration": {

                # Engine
                "engine":
                    cluster.get("Engine"),

                "engine_version":
                    cluster.get(
                        "EngineVersion"
                    ),

                "engine_mode":
                    cluster.get(
                        "EngineMode"
                    ),

                # State
                "status":
                    cluster.get("Status"),

                # Encryption
                "storage_encrypted":
                    cluster.get(
                        "StorageEncrypted"
                    ),

                "kms_key_id":
                    cluster.get("KmsKeyId"),

                # Availability
                "multi_az":
                    cluster.get("MultiAZ"),

                "availability_zones":
                    cluster.get(
                        "AvailabilityZones",
                        []
                    ),

                # Network
                "endpoint":
                    cluster.get("Endpoint"),

                "reader_endpoint":
                    cluster.get(
                        "ReaderEndpoint"
                    ),

                "custom_endpoints":
                    cluster.get(
                        "CustomEndpoints",
                        []
                    ),

                "port":
                    cluster.get("Port"),

                "db_subnet_group":
                    cluster.get(
                        "DBSubnetGroup"
                    ),

                "vpc_security_groups":
                    cluster.get(
                        "VpcSecurityGroups",
                        []
                    ),

                "network_type":
                    cluster.get(
                        "NetworkType"
                    ),

                # Security
                "deletion_protection":
                    cluster.get(
                        "DeletionProtection"
                    ),

                "iam_database_authentication":
                    cluster.get(
                        "IAMDatabaseAuthenticationEnabled"
                    ),

                # Backup
                "backup_retention_period":
                    cluster.get(
                        "BackupRetentionPeriod"
                    ),

                "preferred_backup_window":
                    cluster.get(
                        "PreferredBackupWindow"
                    ),

                "copy_tags_to_snapshot":
                    cluster.get(
                        "CopyTagsToSnapshot"
                    ),

                # Maintenance
                "preferred_maintenance_window":
                    cluster.get(
                        "PreferredMaintenanceWindow"
                    ),

                # Monitoring
                "enabled_cloudwatch_logs_exports":
                    cluster.get(
                        "EnabledCloudwatchLogsExports",
                        []
                    ),

                # Members
                "cluster_members":
                    cluster.get(
                        "DBClusterMembers",
                        []
                    ),

                # Serverless
                "serverless_v2_scaling_configuration":
                    cluster.get(
                        "ServerlessV2ScalingConfiguration",
                        {}
                    ),

                "scaling_configuration":
                    cluster.get(
                        "ScalingConfigurationInfo",
                        {}
                    ),

                # Database
                "database_name":
                    cluster.get(
                        "DatabaseName"
                    ),

                "master_username":
                    cluster.get(
                        "MasterUsername"
                    ),

                # Activity Streams
                "activity_stream_status":
                    cluster.get(
                        "ActivityStreamStatus"
                    ),

                # Time
                "cluster_create_time":
                    cluster.get(
                        "ClusterCreateTime"
                    ).isoformat()
                    if cluster.get(
                        "ClusterCreateTime"
                    ) else None,

                # Misc
                "associated_roles":
                    cluster.get(
                        "AssociatedRoles",
                        []
                    ),

                "domain_memberships":
                    cluster.get(
                        "DomainMemberships",
                        []
                    ),

                "http_endpoint_enabled":
                    cluster.get(
                        "HttpEndpointEnabled"
                    ),

                # Derived
                "is_encrypted":
                    cluster.get(
                        "StorageEncrypted"
                    ),

                "is_serverless":
                    cluster.get(
                        "EngineMode"
                    ) == "serverless"
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
        f"RDS {region} → {len(results)} resources"
    )

    return results