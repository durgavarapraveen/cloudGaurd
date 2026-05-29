import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_ec2(session, region):

    # logger.info(f"Scanning EC2 in {region}")

    client = session.client(
        "ec2",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # EC2 INSTANCES
    # ─────────────────────────────

    reservations = paginate(
        client,
        "describe_instances",
        "Reservations"
    )

    for reservation in reservations:

        for inst in reservation.get(
            "Instances",
            []
        ):

            findings = []

            instance_id = inst.get(
                "InstanceId"
            )

            name = next(

                (
                    t["Value"]
                    for t in inst.get(
                        "Tags",
                        []
                    )
                    if t["Key"] == "Name"
                ),

                instance_id
            )

            metadata_options = inst.get(
                "MetadataOptions",
                {}
            )

            if (
                metadata_options.get(
                    "HttpTokens"
                ) != "required"
            ):

                findings.append({

                    "severity":
                        "MEDIUM",

                    "issue":
                        "IMDSv2 not enforced"
                })

            if inst.get(
                "PublicIpAddress"
            ):

                findings.append({

                    "severity":
                        "LOW",

                    "issue":
                        "Instance has public IP"
                })

            network_interfaces = []

            for eni in inst.get(
                "NetworkInterfaces",
                []
            ):

                network_interfaces.append({

                    "network_interface_id":
                        eni.get(
                            "NetworkInterfaceId"
                        ),

                    "subnet_id":
                        eni.get("SubnetId"),

                    "vpc_id":
                        eni.get("VpcId"),

                    "private_ip":
                        eni.get(
                            "PrivateIpAddress"
                        ),

                    "public_ip":
                        eni.get(
                            "Association",
                            {}
                        ).get("PublicIp"),

                    "security_groups":
                        eni.get("Groups", []),

                    "status":
                        eni.get("Status"),

                    "interface_type":
                        eni.get(
                            "InterfaceType"
                        ),

                    "mac_address":
                        eni.get("MacAddress")
                })

            block_devices = []

            for bd in inst.get(
                "BlockDeviceMappings",
                []
            ):

                ebs = bd.get("Ebs", {})

                block_devices.append({

                    "device_name":
                        bd.get("DeviceName"),

                    "volume_id":
                        ebs.get("VolumeId"),

                    "status":
                        ebs.get("Status"),

                    "attach_time":
                        ebs.get(
                            "AttachTime"
                        ).isoformat()
                        if ebs.get(
                            "AttachTime"
                        ) else None,

                    "delete_on_termination":
                        ebs.get(
                            "DeleteOnTermination"
                        )
                })

            cpu_options = inst.get(
                "CpuOptions",
                {}
            )

            capacity_reservation = inst.get(
                "CapacityReservationSpecification",
                {}
            )

            enclave_options = inst.get(
                "EnclaveOptions",
                {}
            )

            hibernation_options = inst.get(
                "HibernationOptions",
                {}
            )

            maintenance_options = inst.get(
                "MaintenanceOptions",
                {}
            )

            private_dns_name_options = inst.get(
                "PrivateDnsNameOptions",
                {}
            )

            resource = {

                "service": "ec2",

                "resource_type":
                    "ec2_instance",

                "resource_id":
                    instance_id,

                "resource_name":
                    name,

                "arn":
                    f"arn:aws:ec2:{region}::instance/{instance_id}",

                "region":
                    region,

                "configuration": {

                    # Basic
                    "instance_type":
                        inst.get("InstanceType"),

                    "state":
                        inst.get(
                            "State",
                            {}
                        ).get("Name"),

                    "state_transition_reason":
                        inst.get(
                            "StateTransitionReason"
                        ),

                    "architecture":
                        inst.get(
                            "Architecture"
                        ),

                    "platform":
                        inst.get("Platform"),

                    "platform_details":
                        inst.get(
                            "PlatformDetails"
                        ),

                    "virtualization_type":
                        inst.get(
                            "VirtualizationType"
                        ),

                    "hypervisor":
                        inst.get("Hypervisor"),

                    "ena_support":
                        inst.get("EnaSupport"),

                    # Image
                    "image_id":
                        inst.get("ImageId"),

                    # Networking
                    "public_ip":
                        inst.get(
                            "PublicIpAddress"
                        ),

                    "private_ip":
                        inst.get(
                            "PrivateIpAddress"
                        ),

                    "public_dns":
                        inst.get(
                            "PublicDnsName"
                        ),

                    "private_dns":
                        inst.get(
                            "PrivateDnsName"
                        ),

                    "subnet_id":
                        inst.get("SubnetId"),

                    "vpc_id":
                        inst.get("VpcId"),

                    "network_interfaces":
                        network_interfaces,

                    "source_dest_check":
                        inst.get(
                            "SourceDestCheck"
                        ),

                    # Security
                    "security_groups":
                        inst.get(
                            "SecurityGroups",
                            []
                        ),

                    "metadata_options":
                        metadata_options,

                    "imdsv2":
                        metadata_options.get(
                            "HttpTokens"
                        ) == "required",

                    # IAM
                    "iam_instance_profile":
                        inst.get(
                            "IamInstanceProfile"
                        ),

                    # Storage
                    "root_device_name":
                        inst.get(
                            "RootDeviceName"
                        ),

                    "root_device_type":
                        inst.get(
                            "RootDeviceType"
                        ),

                    "block_devices":
                        block_devices,

                    # Monitoring
                    "monitoring":
                        inst.get(
                            "Monitoring",
                            {}
                        ).get("State"),

                    # CPU
                    "cpu_options":
                        cpu_options,

                    # Lifecycle
                    "launch_time":
                        inst.get(
                            "LaunchTime"
                        ).isoformat()
                        if inst.get(
                            "LaunchTime"
                        ) else None,

                    "usage_operation":
                        inst.get(
                            "UsageOperation"
                        ),

                    "usage_operation_update_time":
                        inst.get(
                            "UsageOperationUpdateTime"
                        ).isoformat()
                        if inst.get(
                            "UsageOperationUpdateTime"
                        ) else None,

                    # Placement
                    "placement":
                        inst.get(
                            "Placement",
                            {}
                        ),

                    "tenancy":
                        inst.get(
                            "Placement",
                            {}
                        ).get("Tenancy"),

                    "availability_zone":
                        inst.get(
                            "Placement",
                            {}
                        ).get(
                            "AvailabilityZone"
                        ),

                    # Capacity Reservation
                    "capacity_reservation":
                        capacity_reservation,

                    # Hibernation
                    "hibernation_options":
                        hibernation_options,

                    # Nitro Enclaves
                    "enclave_options":
                        enclave_options,

                    # Maintenance
                    "maintenance_options":
                        maintenance_options,

                    # DNS
                    "private_dns_name_options":
                        private_dns_name_options,

                    # State Reasons
                    "state_reason":
                        inst.get(
                            "StateReason",
                            {}
                        ),

                    # Tags
                    "tag_set":
                        inst.get("Tags", []),

                    # Derived Security Flags
                    "publicly_accessible":
                        bool(
                            inst.get(
                                "PublicIpAddress"
                            )
                        ),

                    "is_running":
                        inst.get(
                            "State",
                            {}
                        ).get("Name")
                        == "running",

                    "detailed_monitoring_enabled":
                        inst.get(
                            "Monitoring",
                            {}
                        ).get("State")
                        == "enabled"
                },

                "tags":
                    inst.get("Tags", []),

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
    # SECURITY GROUPS
    # ─────────────────────────────

    security_groups = paginate(
        client,
        "describe_security_groups",
        "SecurityGroups"
    )

    for sg in security_groups:

        findings = []

        inbound_rules = sg.get(
            "IpPermissions",
            []
        )

        outbound_rules = sg.get(
            "IpPermissionsEgress",
            []
        )

        for rule in inbound_rules:

            for ip_range in rule.get(
                "IpRanges",
                []
            ):

                if ip_range.get("CidrIp") == "0.0.0.0/0":

                    findings.append({

                        "severity":
                            "HIGH",

                        "issue":
                            "Security group allows inbound access from 0.0.0.0/0"
                    })

        resource = {

            "service": "ec2",

            "resource_type":
                "ec2_security_group",

            "resource_id":
                sg.get("GroupId"),

            "resource_name":
                sg.get("GroupName"),

            "arn":
                f"arn:aws:ec2:{region}::security-group/{sg.get('GroupId')}",

            "region":
                region,

            "configuration": {

                "description":
                    sg.get("Description"),

                "owner_id":
                    sg.get("OwnerId"),

                "vpc_id":
                    sg.get("VpcId"),

                "inbound_rules":
                    inbound_rules,

                "outbound_rules":
                    outbound_rules,

                "ip_permissions":
                    inbound_rules,

                "ip_permissions_egress":
                    outbound_rules,

                "tag_set":
                    sg.get("Tags", []),

                # Derived
                "has_open_inbound":
                    any(

                        ip.get("CidrIp")
                        == "0.0.0.0/0"

                        for rule in inbound_rules
                        for ip in rule.get(
                            "IpRanges",
                            []
                        )
                    ),

                "has_open_outbound":
                    any(

                        ip.get("CidrIp")
                        == "0.0.0.0/0"

                        for rule in outbound_rules
                        for ip in rule.get(
                            "IpRanges",
                            []
                        )
                    )
            },

            "tags":
                sg.get("Tags", []),

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
    # EBS VOLUMES
    # ─────────────────────────────

    volumes = paginate(
        client,
        "describe_volumes",
        "Volumes"
    )

    for vol in volumes:

        findings = []

        volume_id = vol.get(
            "VolumeId"
        )

        name = next(

            (
                t["Value"]
                for t in vol.get(
                    "Tags",
                    []
                )
                if t["Key"] == "Name"
            ),

            volume_id
        )

        if not vol.get("Encrypted"):

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Volume is not encrypted"
            })

        attachments = []

        for att in vol.get(
            "Attachments",
            []
        ):

            attachments.append({

                "instance_id":
                    att.get("InstanceId"),

                "device":
                    att.get("Device"),

                "state":
                    att.get("State"),

                "attach_time":
                    att.get(
                        "AttachTime"
                    ).isoformat()
                    if att.get(
                        "AttachTime"
                    ) else None,

                "delete_on_termination":
                    att.get(
                        "DeleteOnTermination"
                    )
            })

        resource = {

            "service": "ec2",

            "resource_type":
                "ec2_volume",

            "resource_id":
                volume_id,

            "resource_name":
                name,

            "arn":
                f"arn:aws:ec2:{region}::volume/{volume_id}",

            "region":
                region,

            "configuration": {

                "size_gb":
                    vol.get("Size"),

                "iops":
                    vol.get("Iops"),

                "throughput":
                    vol.get("Throughput"),

                "encrypted":
                    vol.get("Encrypted"),

                "kms_key_id":
                    vol.get("KmsKeyId"),

                "state":
                    vol.get("State"),

                "volume_type":
                    vol.get("VolumeType"),

                "multi_attach_enabled":
                    vol.get(
                        "MultiAttachEnabled"
                    ),

                "availability_zone":
                    vol.get(
                        "AvailabilityZone"
                    ),

                "snapshot_id":
                    vol.get("SnapshotId"),

                "attachments":
                    attachments,

                "create_time":
                    vol.get(
                        "CreateTime"
                    ).isoformat()
                    if vol.get(
                        "CreateTime"
                    ) else None,

                "fast_restored":
                    vol.get(
                        "FastRestored"
                    ),

                "outpost_arn":
                    vol.get("OutpostArn"),

                "tag_set":
                    vol.get("Tags", []),

                # Derived
                "is_attached":
                    len(attachments) > 0
            },

            "tags":
                vol.get("Tags", []),

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
    # VPCS
    # ─────────────────────────────

    vpcs = paginate(
        client,
        "describe_vpcs",
        "Vpcs"
    )

    for vpc in vpcs:

        findings = []

        vpc_id = vpc.get(
            "VpcId"
        )

        flow_logs_resp = safe_call(

            client.describe_flow_logs,

            Filters=[
                {
                    "Name":
                        "resource-id",

                    "Values":
                        [vpc_id]
                }
            ]
        )

        flow_logs = (
            flow_logs_resp.get(
                "FlowLogs",
                []
            )
            if flow_logs_resp else []
        )

        if not flow_logs:

            findings.append({

                "severity":
                    "MEDIUM",

                "issue":
                    "VPC flow logs not enabled"
            })

        name = next(

            (
                t["Value"]
                for t in vpc.get(
                    "Tags",
                    []
                )
                if t["Key"] == "Name"
            ),

            vpc_id
        )

        cidr_associations = vpc.get(
            "CidrBlockAssociationSet",
            []
        )

        ipv6_associations = vpc.get(
            "Ipv6CidrBlockAssociationSet",
            []
        )

        resource = {

            "service": "ec2",

            "resource_type":
                "ec2_vpc",

            "resource_id":
                vpc_id,

            "resource_name":
                name,

            "arn":
                f"arn:aws:ec2:{region}::vpc/{vpc_id}",

            "region":
                region,

            "configuration": {

                "cidr_block":
                    vpc.get("CidrBlock"),

                "cidr_block_associations":
                    cidr_associations,

                "ipv6_cidr_associations":
                    ipv6_associations,

                "dhcp_options_id":
                    vpc.get(
                        "DhcpOptionsId"
                    ),

                "instance_tenancy":
                    vpc.get(
                        "InstanceTenancy"
                    ),

                "is_default":
                    vpc.get("IsDefault"),

                "state":
                    vpc.get("State"),

                "owner_id":
                    vpc.get("OwnerId"),

                "flow_logs":
                    flow_logs,

                "tag_set":
                    vpc.get("Tags", []),

                # Derived
                "flow_logs_enabled":
                    len(flow_logs) > 0
            },

            "tags":
                vpc.get("Tags", []),

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
    # SUBNETS
    # ─────────────────────────────

    subnets = paginate(
        client,
        "describe_subnets",
        "Subnets"
    )

    for subnet in subnets:

        subnet_id = subnet.get(
            "SubnetId"
        )

        name = next(

            (
                t["Value"]
                for t in subnet.get(
                    "Tags",
                    []
                )
                if t["Key"] == "Name"
            ),

            subnet_id
        )

        results.append({

            "service": "ec2",

            "resource_type":
                "ec2_subnet",

            "resource_id":
                subnet_id,

            "resource_name":
                name,

            "arn":
                f"arn:aws:ec2:{region}::subnet/{subnet_id}",

            "region":
                region,

            "configuration": {

                "vpc_id":
                    subnet.get("VpcId"),

                "cidr_block":
                    subnet.get("CidrBlock"),

                "availability_zone":
                    subnet.get(
                        "AvailabilityZone"
                    ),

                "available_ip_count":
                    subnet.get(
                        "AvailableIpAddressCount"
                    ),

                "map_public_ip_on_launch":
                    subnet.get(
                        "MapPublicIpOnLaunch"
                    ),

                "assign_ipv6_on_creation":
                    subnet.get(
                        "AssignIpv6AddressOnCreation"
                    ),

                "default_for_az":
                    subnet.get(
                        "DefaultForAz"
                    ),

                "state":
                    subnet.get("State"),

                "tag_set":
                    subnet.get("Tags", [])
            },

            "tags":
                subnet.get("Tags", [])
        })

    logger.info(
        f"EC2 {region} → {len(results)} resources"
    )

    return results