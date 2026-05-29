import logging

from scanners.AWS.utils import paginate

logger = logging.getLogger(__name__)


def scan_subnets(session, region):

    client = session.client(
        "ec2",
        region_name=region
    )

    results = []

    subnets = paginate(
        client,
        "describe_subnets",
        "Subnets"
    )

    for subnet in subnets:

        name = next(
            (
                t["Value"]
                for t in subnet.get("Tags", [])
                if t["Key"] == "Name"
            ),
            subnet.get("SubnetId")
        )

        resource = {

            "service": "subnet",

            "resource_type":
                "subnet",

            "resource_id":
                subnet.get("SubnetId"),

            "resource_name":
                name,

            "arn":
                f"arn:aws:ec2:{region}::subnet/{subnet.get('SubnetId')}",

            "region":
                region,

            "configuration": {

                "vpc_id":
                    subnet.get("VpcId"),

                "cidr_block":
                    subnet.get("CidrBlock"),

                "availability_zone":
                    subnet.get("AvailabilityZone"),

                "available_ip_count":
                    subnet.get("AvailableIpAddressCount"),

                "map_public_ip":
                    subnet.get("MapPublicIpOnLaunch"),

                "state":
                    subnet.get("State")
            },

            "tags":
                subnet.get("Tags", [])
        }

        results.append(resource)

    logger.info(f"Subnets {region} → {len(results)} resources")

    return results