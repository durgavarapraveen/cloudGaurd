import logging

from scanners.AWS.utils import paginate, safe_call

logger = logging.getLogger(__name__)


def scan_vpc(session, region):

    client = session.client(
        "ec2",
        region_name=region
    )

    results = []

    vpcs = paginate(
        client,
        "describe_vpcs",
        "Vpcs"
    )

    for vpc in vpcs:

        flow_logs = safe_call(
            client.describe_flow_logs,
            Filters=[
                {
                    "Name": "resource-id",
                    "Values": [vpc["VpcId"]]
                }
            ]
        )

        name = next(
            (
                t["Value"]
                for t in vpc.get("Tags", [])
                if t["Key"] == "Name"
            ),
            vpc.get("VpcId")
        )

        resource = {

            "service": "vpc",

            "resource_type":
                "vpc",

            "resource_id":
                vpc.get("VpcId"),

            "resource_name":
                name,

            "arn":
                f"arn:aws:ec2:{region}::vpc/{vpc.get('VpcId')}",

            "region":
                region,

            "configuration": {

                "cidr_block":
                    vpc.get("CidrBlock"),

                "is_default":
                    vpc.get("IsDefault"),

                "state":
                    vpc.get("State"),

                "dhcp_options_id":
                    vpc.get("DhcpOptionsId"),

                "instance_tenancy":
                    vpc.get("InstanceTenancy"),

                "flow_logs":
                    flow_logs.get("FlowLogs", [])
                    if flow_logs else []
            },

            "tags":
                vpc.get("Tags", [])
        }

        results.append(resource)

    logger.info(f"VPC {region} → {len(results)} resources")

    return results