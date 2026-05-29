import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_transit_gateway(session, region):

    # logger.info(f"Scanning Transit Gateway in {region}")

    client = session.client(
        "ec2",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # TRANSIT GATEWAYS
    # ─────────────────────────────

    transit_gateways = paginate(
        client,
        "describe_transit_gateways",
        "TransitGateways"
    )

    for tgw in transit_gateways:

        tgw_id = tgw.get("TransitGatewayId")

        options = tgw.get(
            "Options",
            {}
        )

        route_tables_resp = safe_call(
            client.describe_transit_gateway_route_tables,
            Filters=[
                {
                    "Name":
                        "transit-gateway-id",

                    "Values":
                        [tgw_id]
                }
            ]
        )

        attachments_resp = safe_call(
            client.describe_transit_gateway_attachments,
            Filters=[
                {
                    "Name":
                        "transit-gateway-id",

                    "Values":
                        [tgw_id]
                }
            ]
        )

        propagation_resp = safe_call(
            client.describe_transit_gateway_route_table_propagations,
            TransitGatewayRouteTableId=(
                route_tables_resp.get(
                    "TransitGatewayRouteTables",
                    [{}]
                )[0].get("TransitGatewayRouteTableId")
                if route_tables_resp and
                route_tables_resp.get(
                    "TransitGatewayRouteTables"
                )
                else ""
            )
        )

        route_tables = []

        if route_tables_resp:

            for rt in route_tables_resp.get(
                "TransitGatewayRouteTables",
                []
            ):

                route_tables.append({

                    "route_table_id":
                        rt.get(
                            "TransitGatewayRouteTableId"
                        ),

                    "state":
                        rt.get("State"),

                    "default_association":
                        rt.get(
                            "DefaultAssociationRouteTable"
                        ),

                    "default_propagation":
                        rt.get(
                            "DefaultPropagationRouteTable"
                        ),

                    "creation_time":
                        rt.get("CreationTime").isoformat()
                        if rt.get("CreationTime") else None
                })

        attachments = []

        if attachments_resp:

            for att in attachments_resp.get(
                "TransitGatewayAttachments",
                []
            ):

                attachments.append({

                    "attachment_id":
                        att.get(
                            "TransitGatewayAttachmentId"
                        ),

                    "resource_id":
                        att.get("ResourceId"),

                    "resource_type":
                        att.get("ResourceType"),

                    "state":
                        att.get("State"),

                    "association":
                        att.get("Association", {})
                })

        propagations = []

        if propagation_resp:

            for prop in propagation_resp.get(
                "TransitGatewayRouteTablePropagations",
                []
            ):

                propagations.append({

                    "attachment_id":
                        prop.get(
                            "TransitGatewayAttachmentId"
                        ),

                    "resource_id":
                        prop.get("ResourceId"),

                    "resource_type":
                        prop.get("ResourceType"),

                    "state":
                        prop.get("State")
                })

        resource = {

            "service": "ec2",

            "resource_type":
                "transit_gateway",

            "resource_id":
                tgw_id,

            "resource_name":
                next(

                    (
                        t["Value"]
                        for t in tgw.get("Tags", [])
                        if t["Key"] == "Name"
                    ),

                    tgw_id
                ),

            "arn":
                tgw.get("TransitGatewayArn"),

            "region":
                region,

            "configuration": {

                # Basic Info
                "owner_id":
                    tgw.get("OwnerId"),

                "state":
                    tgw.get("State"),

                "description":
                    tgw.get("Description"),

                # ASN / Networking
                "amazon_side_asn":
                    options.get("AmazonSideAsn"),

                "transit_gateway_cidr_blocks":
                    options.get(
                        "TransitGatewayCidrBlocks",
                        []
                    ),

                # Attachment Controls
                "auto_accept_attachments":
                    options.get(
                        "AutoAcceptSharedAttachments"
                    ),

                "default_route_table_association":
                    options.get(
                        "DefaultRouteTableAssociation"
                    ),

                "default_route_table_propagation":
                    options.get(
                        "DefaultRouteTablePropagation"
                    ),

                # Feature Support
                "vpn_ecmp_support":
                    options.get("VpnEcmpSupport"),

                "dns_support":
                    options.get("DnsSupport"),

                "multicast_support":
                    options.get("MulticastSupport"),

                "security_group_referencing_support":
                    options.get(
                        "SecurityGroupReferencingSupport"
                    ),

                # Route Tables
                "route_tables":
                    route_tables,

                "route_table_count":
                    len(route_tables),

                # Attachments
                "attachments":
                    attachments,

                "attachment_count":
                    len(attachments),

                # Propagations
                "propagations":
                    propagations,

                "propagation_count":
                    len(propagations),

                # Dates
                "creation_time":
                    tgw.get("CreationTime").isoformat()
                    if tgw.get("CreationTime") else None,

                # Derived Security Flags
                "is_available":
                    tgw.get("State") == "available",

                "auto_accept_enabled":
                    options.get(
                        "AutoAcceptSharedAttachments"
                    ) == "enable",

                "dns_enabled":
                    options.get(
                        "DnsSupport"
                    ) == "enable",

                "multicast_enabled":
                    options.get(
                        "MulticastSupport"
                    ) == "enable",

                "vpn_ecmp_enabled":
                    options.get(
                        "VpnEcmpSupport"
                    ) == "enable"
            },

            "tags":
                tgw.get("Tags", [])
        }

        results.append(resource)

    # ─────────────────────────────
    # TRANSIT GATEWAY ATTACHMENTS
    # ─────────────────────────────

    attachments = paginate(
        client,
        "describe_transit_gateway_attachments",
        "TransitGatewayAttachments"
    )

    for att in attachments:

        attachment_id = att.get(
            "TransitGatewayAttachmentId"
        )

        association = att.get(
            "Association",
            {}
        )

        resource = {

            "service": "ec2",

            "resource_type":
                "transit_gateway_attachment",

            "resource_id":
                attachment_id,

            "resource_name":
                next(

                    (
                        t["Value"]
                        for t in att.get("Tags", [])
                        if t["Key"] == "Name"
                    ),

                    attachment_id
                ),

            "arn":
                f"arn:aws:ec2:{region}::transit-gateway-attachment/{attachment_id}",

            "region":
                region,

            "configuration": {

                # Basic Info
                "transit_gateway_id":
                    att.get("TransitGatewayId"),

                "transit_gateway_owner_id":
                    att.get(
                        "TransitGatewayOwnerId"
                    ),

                "resource_id_attached":
                    att.get("ResourceId"),

                "resource_owner_id":
                    att.get("ResourceOwnerId"),

                "resource_type_attached":
                    att.get("ResourceType"),

                "state":
                    att.get("State"),

                # Association
                "association":
                    association,

                "association_state":
                    association.get("State"),

                "route_table_id":
                    association.get(
                        "TransitGatewayRouteTableId"
                    ),

                # Attachment Options
                "options":
                    att.get("Options", {}),

                # Creation Time
                "creation_time":
                    att.get("CreationTime").isoformat()
                    if att.get("CreationTime") else None,

                # Derived Flags
                "is_associated":
                    association.get("State")
                    == "associated",

                "is_available":
                    att.get("State") == "available",

                "is_vpc_attachment":
                    att.get("ResourceType") == "vpc",

                "is_vpn_attachment":
                    att.get("ResourceType") == "vpn",

                "is_dx_attachment":
                    att.get("ResourceType")
                    == "direct-connect-gateway"
            },

            "tags":
                att.get("Tags", [])
        }

        results.append(resource)

    logger.info(f"Transit Gateway {region} → {len(results)} resources")

    return results