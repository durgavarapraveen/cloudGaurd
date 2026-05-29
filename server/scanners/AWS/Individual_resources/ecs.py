import logging

from scanners.AWS.utils import paginate, safe_call

logger = logging.getLogger(__name__)


def scan_ecs(session, region):

    # logger.info(f"Scanning ECS in {region}")

    client = session.client(
        "ecs",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # ECS CLUSTERS
    # ─────────────────────────────

    cluster_arns = paginate(
        client,
        "list_clusters",
        "clusterArns"
    )

    if cluster_arns:

        clusters_resp = safe_call(
            client.describe_clusters,
            clusters=cluster_arns,
            include=[
                "ATTACHMENTS",
                "CONFIGURATIONS",
                "SETTINGS",
                "STATISTICS",
                "TAGS"
            ]
        )

        for cluster in (
            clusters_resp.get("clusters", [])
            if clusters_resp else []
        ):

            findings = []

            cluster_arn = cluster.get(
                "clusterArn"
            )

            cluster_name = cluster.get(
                "clusterName"
            )

            # ─────────────────────────
            # Container Insights
            # ─────────────────────────

            container_insights = False

            for setting in cluster.get(
                "settings",
                []
            ):

                if (
                    setting.get("name")
                    == "containerInsights"
                ):

                    container_insights = (
                        setting.get("value")
                        == "enabled"
                    )

            if not container_insights:

                findings.append({

                    "severity":
                        "LOW",

                    "issue":
                        "Container Insights disabled"
                })

            # ─────────────────────────
            # Execute Command
            # ─────────────────────────

            exec_config = cluster.get(
                "configuration",
                {}
            ).get(
                "executeCommandConfiguration",
                {}
            )

            if exec_config:

                if (
                    exec_config.get("logging")
                    == "NONE"
                ):

                    findings.append({

                        "severity":
                            "MEDIUM",

                        "issue":
                            "Execute command logging disabled"
                    })

            else:

                findings.append({

                    "severity":
                        "LOW",

                    "issue":
                        "Execute command not configured"
                })

            # ─────────────────────────
            # Cluster Capacity Providers
            # ─────────────────────────

            capacity_providers = cluster.get(
                "capacityProviders",
                []
            )

            default_capacity_provider_strategy = (
                cluster.get(
                    "defaultCapacityProviderStrategy",
                    []
                )
            )

            # ─────────────────────────
            # Attachments
            # ─────────────────────────

            attachments = []

            for attachment in cluster.get(
                "attachments",
                []
            ):

                attachments.append({

                    "id":
                        attachment.get("id"),

                    "type":
                        attachment.get("type"),

                    "status":
                        attachment.get("status"),

                    "details":
                        attachment.get(
                            "details",
                            []
                        )
                })

            # ─────────────────────────
            # Statistics
            # ─────────────────────────

            statistics = []

            for stat in cluster.get(
                "statistics",
                []
            ):

                statistics.append({

                    "name":
                        stat.get("name"),

                    "value":
                        stat.get("value")
                })

            # ─────────────────────────
            # Configuration Object
            # ─────────────────────────

            configuration = cluster.get(
                "configuration",
                {}
            )

            # ─────────────────────────
            # Resource
            # ─────────────────────────

            resource = {

                "service": "ecs",

                "resource_type":
                    "ecs_cluster",

                "resource_id":
                    cluster_arn,

                "resource_name":
                    cluster_name,

                "arn":
                    cluster_arn,

                "region":
                    region,

                "configuration": {

                    # Basic Info
                    "cluster_name":
                        cluster_name,

                    "status":
                        cluster.get("status"),

                    # Capacity
                    "registered_container_instances":
                        cluster.get(
                            "registeredContainerInstancesCount"
                        ),

                    "running_tasks":
                        cluster.get(
                            "runningTasksCount"
                        ),

                    "pending_tasks":
                        cluster.get(
                            "pendingTasksCount"
                        ),

                    "active_services":
                        cluster.get(
                            "activeServicesCount"
                        ),

                    # Capacity Providers
                    "capacity_providers":
                        capacity_providers,

                    "default_capacity_provider_strategy":
                        default_capacity_provider_strategy,

                    # Settings
                    "settings":
                        cluster.get(
                            "settings",
                            []
                        ),

                    # Execute Command
                    "execute_command_configuration":
                        exec_config,

                    # Cluster Configuration
                    "configuration_object":
                        configuration,

                    # Service Connect
                    "service_connect_defaults":
                        configuration.get(
                            "serviceConnectDefaults"
                        ),

                    # Attachments
                    "attachments":
                        attachments,

                    # Statistics
                    "statistics":
                        statistics,

                    # Tags
                    "tag_set":
                        cluster.get("tags", []),

                    # Derived Flags
                    "container_insights_enabled":
                        container_insights,

                    "execute_command_enabled":
                        bool(exec_config),

                    "execute_command_logging_enabled":
                        (
                            exec_config.get("logging")
                            != "NONE"
                        )
                        if exec_config else False,

                    "has_fargate":
                        "FARGATE"
                        in capacity_providers,

                    "has_ec2":
                        "EC2"
                        in capacity_providers,

                    "is_active":
                        cluster.get("status")
                        == "ACTIVE"
                },

                "tags":
                    cluster.get("tags", []),

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
    # ECS SERVICES
    # ─────────────────────────────

    for cluster_arn in cluster_arns:

        service_arns = paginate(
            client,
            "list_services",
            "serviceArns",
            cluster=cluster_arn
        )

        if not service_arns:
            continue

        for i in range(0, len(service_arns), 10):

            batch = service_arns[i:i + 10]

            services_resp = safe_call(
                client.describe_services,
                cluster=cluster_arn,
                services=batch,
                include=["TAGS"]
            )

            for service in (
                services_resp.get("services", [])
                if services_resp else []
            ):

                findings = []

                deployment_configuration = service.get(
                    "deploymentConfiguration",
                    {}
                )

                network_configuration = service.get(
                    "networkConfiguration",
                    {}
                )

                awsvpc_config = network_configuration.get(
                    "awsvpcConfiguration",
                    {}
                )

                if (
                    awsvpc_config.get(
                        "assignPublicIp"
                    ) == "ENABLED"
                ):

                    findings.append({

                        "severity":
                            "MEDIUM",

                        "issue":
                            "Public IP assignment enabled"
                    })

                if (
                    service.get(
                        "enableExecuteCommand"
                    ) is False
                ):

                    findings.append({

                        "severity":
                            "LOW",

                        "issue":
                            "Execute command disabled"
                    })

                load_balancers = service.get(
                    "loadBalancers",
                    []
                )

                deployments = []

                for dep in service.get(
                    "deployments",
                    []
                ):

                    deployments.append({

                        "id":
                            dep.get("id"),

                        "status":
                            dep.get("status"),

                        "rollout_state":
                            dep.get(
                                "rolloutState"
                            ),

                        "task_definition":
                            dep.get(
                                "taskDefinition"
                            ),

                        "desired_count":
                            dep.get(
                                "desiredCount"
                            ),

                        "pending_count":
                            dep.get(
                                "pendingCount"
                            ),

                        "running_count":
                            dep.get(
                                "runningCount"
                            ),

                        "created_at":
                            dep.get(
                                "createdAt"
                            ).isoformat()
                            if dep.get(
                                "createdAt"
                            ) else None,

                        "updated_at":
                            dep.get(
                                "updatedAt"
                            ).isoformat()
                            if dep.get(
                                "updatedAt"
                            ) else None
                    })

                resource = {

                    "service": "ecs",

                    "resource_type":
                        "ecs_service",

                    "resource_id":
                        service.get("serviceArn"),

                    "resource_name":
                        service.get("serviceName"),

                    "arn":
                        service.get("serviceArn"),

                    "region":
                        region,

                    "configuration": {

                        # Basic Info
                        "cluster_arn":
                            service.get("clusterArn"),

                        "status":
                            service.get("status"),

                        "launch_type":
                            service.get("launchType"),

                        "platform_version":
                            service.get(
                                "platformVersion"
                            ),

                        # Task Counts
                        "desired_count":
                            service.get(
                                "desiredCount"
                            ),

                        "running_count":
                            service.get(
                                "runningCount"
                            ),

                        "pending_count":
                            service.get(
                                "pendingCount"
                            ),

                        # Deployment
                        "deployment_configuration":
                            deployment_configuration,

                        "deployments":
                            deployments,

                        # Networking
                        "network_configuration":
                            network_configuration,

                        "subnets":
                            awsvpc_config.get(
                                "subnets",
                                []
                            ),

                        "security_groups":
                            awsvpc_config.get(
                                "securityGroups",
                                []
                            ),

                        "assign_public_ip":
                            awsvpc_config.get(
                                "assignPublicIp"
                            ),

                        # Load Balancer
                        "load_balancers":
                            load_balancers,

                        # Task Definition
                        "task_definition":
                            service.get(
                                "taskDefinition"
                            ),

                        # Scheduling
                        "scheduling_strategy":
                            service.get(
                                "schedulingStrategy"
                            ),

                        # Placement
                        "placement_constraints":
                            service.get(
                                "placementConstraints",
                                []
                            ),

                        "placement_strategy":
                            service.get(
                                "placementStrategy",
                                []
                            ),

                        # Execute Command
                        "enable_execute_command":
                            service.get(
                                "enableExecuteCommand"
                            ),

                        # Service Discovery
                        "service_registries":
                            service.get(
                                "serviceRegistries",
                                []
                            ),

                        # Tags
                        "tag_set":
                            service.get("tags", []),

                        # Derived Flags
                        "public_ip_enabled":
                            (
                                awsvpc_config.get(
                                    "assignPublicIp"
                                )
                                == "ENABLED"
                            ),

                        "has_load_balancer":
                            len(load_balancers) > 0,

                        "is_fargate":
                            service.get(
                                "launchType"
                            ) == "FARGATE",

                        "is_ec2":
                            service.get(
                                "launchType"
                            ) == "EC2",

                        "is_active":
                            service.get("status")
                            == "ACTIVE"
                    },

                    "tags":
                        service.get("tags", []),

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
    # TASK DEFINITIONS
    # ─────────────────────────────

    task_definition_arns = paginate(
        client,
        "list_task_definitions",
        "taskDefinitionArns",
        status="ACTIVE",
        sort="DESC"
    )

    seen_families = set()

    unique_arns = []

    for arn in task_definition_arns:

        family = arn.rsplit(":", 1)[0]

        if family not in seen_families:

            seen_families.add(family)

            unique_arns.append(arn)

    MAX_TASK_DEFINITIONS = 200

    for arn in unique_arns[:MAX_TASK_DEFINITIONS]:

        task_definition_resp = safe_call(
            client.describe_task_definition,
            taskDefinition=arn,
            include=["TAGS"]
        )

        if not task_definition_resp:
            continue

        td = task_definition_resp.get(
            "taskDefinition",
            {}
        )

        findings = []

        container_definitions = []

        for container in td.get(
            "containerDefinitions",
            []
        ):

            cname = container.get("name")

            if container.get("privileged"):

                findings.append({

                    "severity":
                        "HIGH",

                    "issue":
                        f"{cname} runs privileged container"
                })

            if container.get("user") == "root":

                findings.append({

                    "severity":
                        "MEDIUM",

                    "issue":
                        f"{cname} runs as root"
                })

            if not container.get(
                "readonlyRootFilesystem",
                False
            ):

                findings.append({

                    "severity":
                        "LOW",

                    "issue":
                        f"{cname} writable root filesystem"
                })

            image = container.get(
                "image",
                ""
            )

            if ":latest" in image:

                findings.append({

                    "severity":
                        "LOW",

                    "issue":
                        f"{cname} uses latest image tag"
                })

            container_definitions.append({

                "name":
                    cname,

                "image":
                    image,

                "cpu":
                    container.get("cpu"),

                "memory":
                    container.get("memory"),

                "memory_reservation":
                    container.get(
                        "memoryReservation"
                    ),

                "essential":
                    container.get("essential"),

                "privileged":
                    container.get("privileged"),

                "readonly_root_filesystem":
                    container.get(
                        "readonlyRootFilesystem"
                    ),

                "user":
                    container.get("user"),

                "linux_parameters":
                    container.get(
                        "linuxParameters"
                    ),

                "mount_points":
                    container.get(
                        "mountPoints",
                        []
                    ),

                "port_mappings":
                    container.get(
                        "portMappings",
                        []
                    ),

                "environment":
                    container.get(
                        "environment",
                        []
                    ),

                "secrets":
                    container.get(
                        "secrets",
                        []
                    ),

                "health_check":
                    container.get(
                        "healthCheck"
                    ),

                "log_configuration":
                    container.get(
                        "logConfiguration"
                    ),

                "docker_security_options":
                    container.get(
                        "dockerSecurityOptions",
                        []
                    )
            })

        resource = {

            "service": "ecs",

            "resource_type":
                "ecs_task_definition",

            "resource_id":
                td.get("taskDefinitionArn"),

            "resource_name":
                f"{td.get('family')}:{td.get('revision')}",

            "arn":
                td.get("taskDefinitionArn"),

            "region":
                region,

            "configuration": {

                # Basic Info
                "family":
                    td.get("family"),

                "revision":
                    td.get("revision"),

                "status":
                    td.get("status"),

                # Runtime
                "network_mode":
                    td.get("networkMode"),

                "runtime_platform":
                    td.get(
                        "runtimePlatform"
                    ),

                "requires_compatibilities":
                    td.get(
                        "requiresCompatibilities",
                        []
                    ),

                # Resources
                "cpu":
                    td.get("cpu"),

                "memory":
                    td.get("memory"),

                # Roles
                "task_role_arn":
                    td.get("taskRoleArn"),

                "execution_role_arn":
                    td.get("executionRoleArn"),

                # Containers
                "container_definitions":
                    container_definitions,

                # Volumes
                "volumes":
                    td.get("volumes", []),

                # Placement
                "placement_constraints":
                    td.get(
                        "placementConstraints",
                        []
                    ),

                # IPC / PID
                "pid_mode":
                    td.get("pidMode"),

                "ipc_mode":
                    td.get("ipcMode"),

                # Proxy
                "proxy_configuration":
                    td.get(
                        "proxyConfiguration"
                    ),

                # Ephemeral Storage
                "ephemeral_storage":
                    td.get(
                        "ephemeralStorage"
                    ),

                # Inference Accelerators
                "inference_accelerators":
                    td.get(
                        "inferenceAccelerators",
                        []
                    ),

                # Registered At
                "registered_at":
                    td.get(
                        "registeredAt"
                    ).isoformat()
                    if td.get(
                        "registeredAt"
                    ) else None,

                "registered_by":
                    td.get("registeredBy"),

                # Derived Security Flags
                "has_privileged_container":
                    any(
                        c.get("privileged")
                        for c in container_definitions
                    ),

                "has_root_container":
                    any(
                        c.get("user") == "root"
                        for c in container_definitions
                    ),

                "has_writable_root_filesystem":
                    any(
                        not c.get(
                            "readonly_root_filesystem",
                            False
                        )
                        for c in container_definitions
                    ),

                "uses_latest_tag":
                    any(
                        ":latest" in (
                            c.get("image", "")
                        )
                        for c in container_definitions
                    )
            },

            "tags":
                task_definition_resp.get(
                    "tags",
                    []
                ),

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
        f"ECS {region} → {len(results)} resources"
    )

    return results