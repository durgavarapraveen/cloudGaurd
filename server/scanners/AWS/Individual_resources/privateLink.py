import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_privatelink(session, region):

    # logger.info(f"Scanning PrivateLink/VPC Endpoints in {region}")

    client = session.client(
        "ec2",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # VPC ENDPOINTS
    # ─────────────────────────────

    endpoints = paginate(
        client,
        "describe_vpc_endpoints",
        "VpcEndpoints"
    )

    for ep in endpoints:

        endpoint_id = ep.get(
            "VpcEndpointId"
        )

        route_tables = []

        for rt_id in ep.get(
            "RouteTableIds",
            []
        ):

            route_tables.append({

                "route_table_id":
                    rt_id
            })

        security_groups = []

        for sg in ep.get(
            "Groups",
            []
        ):

            security_groups.append({

                "group_id":
                    sg.get("GroupId"),

                "group_name":
                    sg.get("GroupName")
            })

        dns_entries = []

        for dns in ep.get(
            "DnsEntries",
            []
        ):

            dns_entries.append({

                "dns_name":
                    dns.get("DnsName"),

                "hosted_zone_id":
                    dns.get("HostedZoneId")
            })

        policy_document = ep.get(
            "PolicyDocument"
        )

        resource = {

            "service": "ec2",

            "resource_type":
                "vpc_endpoint",

            "resource_id":
                endpoint_id,

            "resource_name":
                next(

                    (
                        t["Value"]
                        for t in ep.get("Tags", [])
                        if t["Key"] == "Name"
                    ),

                    endpoint_id
                ),

            "arn":
                f"arn:aws:ec2:{region}::vpc-endpoint/{endpoint_id}",

            "region":
                region,

            "configuration": {

                # Basic Info
                "vpc_id":
                    ep.get("VpcId"),

                "service_name":
                    ep.get("ServiceName"),

                "service_region":
                    ep.get("ServiceRegion"),

                "owner_id":
                    ep.get("OwnerId"),

                "state":
                    ep.get("State"),

                # Endpoint Type
                "endpoint_type":
                    ep.get("VpcEndpointType"),

                "is_interface_endpoint":
                    ep.get("VpcEndpointType")
                    == "Interface",

                "is_gateway_endpoint":
                    ep.get("VpcEndpointType")
                    == "Gateway",

                "is_gateway_load_balancer":
                    ep.get("VpcEndpointType")
                    == "GatewayLoadBalancer",

                # Networking
                "subnet_ids":
                    ep.get("SubnetIds", []),

                "route_table_ids":
                    ep.get("RouteTableIds", []),

                "route_tables":
                    route_tables,

                "network_interface_ids":
                    ep.get(
                        "NetworkInterfaceIds",
                        []
                    ),

                # Security Groups
                "security_groups":
                    security_groups,

                "security_group_count":
                    len(security_groups),

                # DNS
                "private_dns_enabled":
                    ep.get(
                        "PrivateDnsEnabled"
                    ),

                "dns_options":
                    ep.get("DnsOptions", {}),

                "dns_entries":
                    dns_entries,

                # Policy
                "policy_document":
                    policy_document,

                "has_policy":
                    policy_document is not None,

                # Requester Managed
                "requester_managed":
                    ep.get("RequesterManaged"),

                # IP Address Type
                "ip_address_type":
                    ep.get("IpAddressType"),

                # Creation Time
                "creation_timestamp":
                    ep.get(
                        "CreationTimestamp"
                    ).isoformat()
                    if ep.get(
                        "CreationTimestamp"
                    ) else None,

                # Tags
                "tag_set":
                    ep.get("Tags", []),

                # Derived Security Flags
                "private_dns":
                    ep.get(
                        "PrivateDnsEnabled",
                        False
                    ),

                "is_available":
                    ep.get("State")
                    == "available",

                "has_security_groups":
                    len(security_groups) > 0,

                "cross_account_possible":
                    (
                        policy_document is not None and
                        '"Principal":"*"' in str(
                            policy_document
                        )
                    )
            },

            "tags":
                ep.get("Tags", [])
        }

        results.append(resource)

    # ─────────────────────────────
    # VPC ENDPOINT SERVICES
    # ─────────────────────────────

    service_resp = safe_call(
        client.describe_vpc_endpoint_services,
        Filters=[
            {
                "Name":
                    "owner",

                "Values":
                    ["self"]
            }
        ]
    )

    for svc in (
        service_resp.get(
            "ServiceDetails",
            []
        )
        if service_resp else []
    ):

        service_id = svc.get("ServiceId")

        allowed_principals_resp = safe_call(
            client.describe_vpc_endpoint_service_permissions,
            ServiceId=service_id
        )

        allowed_principals = []

        if allowed_principals_resp:

            for principal in allowed_principals_resp.get(
                "AllowedPrincipals",
                []
            ):

                allowed_principals.append({

                    "principal":
                        principal.get("Principal"),

                    "principal_type":
                        principal.get(
                            "PrincipalType"
                        )
                })

        service_types = [

            st.get("ServiceType")
            for st in svc.get(
                "ServiceType",
                []
            )
        ]

        resource = {

            "service": "ec2",

            "resource_type":
                "vpc_endpoint_service",

            "resource_id":
                service_id,

            "resource_name":
                svc.get("ServiceName"),

            "arn":
                f"arn:aws:ec2:{region}::vpc-endpoint-service/{service_id}",

            "region":
                region,

            "configuration": {

                # Basic Info
                "service_name":
                    svc.get("ServiceName"),

                "service_id":
                    service_id,

                "service_state":
                    svc.get("ServiceState"),

                "service_type":
                    service_types,

                "base_endpoint_dns_names":
                    svc.get(
                        "BaseEndpointDnsNames",
                        []
                    ),

                # Endpoint Acceptance
                "acceptance_required":
                    svc.get(
                        "AcceptanceRequired"
                    ),

                "manages_vpc_endpoints":
                    svc.get(
                        "ManagesVpcEndpoints"
                    ),

                # Networking
                "availability_zones":
                    svc.get(
                        "AvailabilityZones",
                        []
                    ),

                "availability_zone_count":
                    len(
                        svc.get(
                            "AvailabilityZones",
                            []
                        )
                    ),

                # Load Balancers
                "network_load_balancer_arns":
                    svc.get(
                        "NetworkLoadBalancerArns",
                        []
                    ),

                "gateway_load_balancer_arns":
                    svc.get(
                        "GatewayLoadBalancerArns",
                        []
                    ),

                # Supported IP Address Types
                "supported_ip_address_types":
                    svc.get(
                        "SupportedIpAddressTypes",
                        []
                    ),

                # Private DNS
                "private_dns_name":
                    svc.get("PrivateDnsName"),

                "private_dns_name_configuration":
                    svc.get(
                        "PrivateDnsNameConfiguration"
                    ),

                # Permissions
                "allowed_principals":
                    allowed_principals,

                "allowed_principal_count":
                    len(allowed_principals),

                # Payer Responsibility
                "payer_responsibility":
                    svc.get(
                        "PayerResponsibility"
                    ),

                # Tags
                "tag_set":
                    svc.get("Tags", []),

                # Derived Security Flags
                "requires_acceptance":
                    svc.get(
                        "AcceptanceRequired",
                        False
                    ),

                "has_allowed_principals":
                    len(allowed_principals) > 0,

                "publicly_accessible":
                    any(
                        p.get("principal") == "*"
                        for p in allowed_principals
                    ),

                "is_available":
                    svc.get("ServiceState")
                    == "Available"
            },

            "tags":
                svc.get("Tags", [])
        }

        results.append(resource)

    logger.info(f"PrivateLink {region} → {len(results)} resources")

    return results